import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { resolveDatabasePath } from '../database/database-options';
import { CURRENT_SCHEMA_VERSION } from '../database/schema-version';
import { BACKUP_DATABASE_PATH, BACKUP_EXTENSION } from './backup.constants';
import { BackupError } from './backup.errors';
import { BackupOperationLockService } from './backup-operation-lock.service';
import { BackupService } from './backup.service';
import type {
  RestoreBackupOptions,
  RestoreBackupResult,
  RestoreWorkspace,
} from './backup.types';
import { BackupValidationService } from './backup-validation.service';
import {
  RestoreAssetsService,
  type InstalledRestoreAsset,
} from './restore-assets.service';
import { RestoreMigrationService } from './restore-migration.service';
import { RestoreProgressService } from './restore-progress.service';
import {
  RestoreSwapService,
  type DatabaseSwapReceipt,
} from './restore-swap.service';
import { RestoreValidationService } from './restore-validation.service';
import { RestoreWorkspaceService } from './restore-workspace.service';

@Injectable()
export class BackupRestoreService {
  private readonly logger = new Logger(BackupRestoreService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly backupService: BackupService,
    private readonly backupValidation: BackupValidationService,
    private readonly restoreValidation: RestoreValidationService,
    private readonly migrationService: RestoreMigrationService,
    private readonly assetsService: RestoreAssetsService,
    private readonly swapService: RestoreSwapService,
    private readonly workspaceService: RestoreWorkspaceService,
    private readonly operationLock: BackupOperationLockService,
    private readonly progress: RestoreProgressService,
  ) {}

  async restoreBackup(
    options: RestoreBackupOptions,
  ): Promise<RestoreBackupResult> {
    const operationToken = this.operationLock.acquire('RESTORE');
    this.progress.start();
    const activeDatabasePath = resolve(resolveDatabasePath(process.env));
    const archivePath = this.normalizeArchivePath(options.filePath);
    const tempRootPath = join(dirname(dirname(activeDatabasePath)), 'temp');
    let workspace: RestoreWorkspace | undefined;
    let installedAssets: InstalledRestoreAsset[] = [];
    let stagedDatabasePath: string | undefined;
    let swapReceipt: DatabaseSwapReceipt | undefined;
    let dataSourceClosed = false;
    let restoreCommitted = false;
    let safetyBackup:
      | Awaited<ReturnType<BackupService['createBackup']>>
      | undefined;

    try {
      this.progress.setStep('VALIDATING');
      const preflightManifest =
        await this.backupValidation.inspectBackupManifest(archivePath);

      this.progress.setStep('SAFETY_BACKUP');
      const safetyDestination = await this.createSafetyBackupDestination(
        activeDatabasePath,
      );
      try {
        safetyBackup = await this.backupService.createBackup({
          destinationPath: safetyDestination,
          databasePath: activeDatabasePath,
          tempRootPath,
          appVersion: options.appVersion,
          operationToken,
        });
      } catch (error) {
        throw new BackupError(
          'SAFETY_BACKUP_FAILED',
          'The pre-restore safety backup could not be created.',
          { cause: error },
        );
      }

      this.progress.setStep('PREPARING');
      workspace = await this.workspaceService.createRestoreWorkspace(tempRootPath);
      const validated = await this.backupValidation.validateBackupArchive(
        archivePath,
        workspace.extractedDirectory,
      );
      if (
        validated.manifest.schemaVersion !== preflightManifest.schemaVersion ||
        validated.manifest.createdAt !== preflightManifest.createdAt
      ) {
        throw new BackupError(
          'ARCHIVE_INVALID',
          'The selected backup changed after its initial validation.',
        );
      }

      const extractedDatabasePath = join(
        workspace.extractedDirectory,
        ...BACKUP_DATABASE_PATH.split('/'),
      );
      await copyFile(
        extractedDatabasePath,
        workspace.temporaryDatabasePath,
        fsConstants.COPYFILE_EXCL,
      );
      this.restoreValidation.validateDatabase(
        workspace.temporaryDatabasePath,
        validated.manifest.schemaVersion,
        false,
      );

      this.progress.setStep('MIGRATING');
      await this.migrationService.migrateTemporaryDatabase(
        workspace.temporaryDatabasePath,
        validated.manifest.schemaVersion,
      );
      installedAssets = await this.assetsService.preparePortableAssets(
        workspace.temporaryDatabasePath,
        workspace.extractedDirectory,
        activeDatabasePath,
        validated.manifest,
      );
      this.restoreValidation.validateDatabase(
        workspace.temporaryDatabasePath,
        CURRENT_SCHEMA_VERSION,
        true,
      );

      stagedDatabasePath = await this.swapService.prepareDatabase(
        workspace.temporaryDatabasePath,
        activeDatabasePath,
        workspace.id,
      );
      this.restoreValidation.validateDatabase(
        stagedDatabasePath,
        CURRENT_SCHEMA_VERSION,
        true,
      );

      this.progress.setStep('SWAPPING');
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        dataSourceClosed = true;
      }

      try {
        swapReceipt = await this.swapService.activateDatabase(
          activeDatabasePath,
          stagedDatabasePath,
          workspace.id,
        );
        this.progress.setStep('FINAL_VALIDATION');
        this.restoreValidation.validateDatabase(
          activeDatabasePath,
          CURRENT_SCHEMA_VERSION,
          true,
        );
      } catch (error) {
        if (swapReceipt) {
          try {
            await this.swapService.rollbackDatabase(swapReceipt);
          } catch (rollbackError) {
            if (rollbackError instanceof BackupError) throw rollbackError;
            throw new BackupError(
              'RESTORE_ROLLBACK_FAILED',
              'The previous database could not be restored after final validation.',
              { cause: rollbackError },
            );
          }
          swapReceipt = undefined;
        }
        await this.reopenPreviousDatabase();
        dataSourceClosed = false;
        if (
          error instanceof BackupError &&
          ['RESTORE_SWAP_FAILED', 'RESTORE_ROLLBACK_FAILED'].includes(error.code)
        ) {
          throw error;
        }
        throw new BackupError(
          'RESTORE_SWAP_FAILED',
          'The final database swap validation failed.',
          { cause: error },
        );
      }

      restoreCommitted = true;
      this.progress.setStep('RESTARTING');
      this.operationLock.markRestoreComplete(operationToken);
      if (swapReceipt) {
        await this.swapService.finalizeDatabase(swapReceipt).catch((error) =>
          this.logger.warn(
            `The restored database is active, but an old staging file could not be cleaned: ${String(error)}`,
          ),
        );
      }

      return {
        restoredBackupFileName: basename(archivePath),
        restoredBackupCreatedAt: validated.manifest.createdAt,
        safetyBackupFileName: safetyBackup.fileName,
        safetyBackupCreatedAt: safetyBackup.manifest.createdAt,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        statistics: validated.manifest.statistics,
      };
    } catch (error) {
      const safeError =
        error instanceof BackupError
          ? error
          : new BackupError(
              'RESTORE_FAILED',
              'The backup could not be restored safely.',
              { cause: error },
            );
      this.progress.fail(safeError.code);

      if (
        dataSourceClosed &&
        !this.dataSource.isInitialized &&
        safeError.code !== 'RESTORE_ROLLBACK_FAILED'
      ) {
        await this.reopenPreviousDatabase().catch((reopenError) => {
          this.logger.error(
            `The previous database could not be reopened: ${String(reopenError)}`,
          );
        });
      }
      if (!restoreCommitted && safeError.code !== 'RESTORE_ROLLBACK_FAILED') {
        await this.assetsService.cleanupPreparedAssets(installedAssets);
      }
      this.logger.error(`Restore failed safely: ${safeError.code}`);
      throw safeError;
    } finally {
      await this.swapService.cleanupPreparedDatabase(stagedDatabasePath);
      if (workspace) {
        await this.workspaceService.cleanupRestoreWorkspace(workspace).catch(
          (error) => this.logger.warn(`Restore workspace cleanup failed: ${String(error)}`),
        );
      }
      if (!restoreCommitted) this.operationLock.release(operationToken);
    }
  }

  private async reopenPreviousDatabase() {
    if (!this.dataSource.isInitialized) await this.dataSource.initialize();
  }

  private normalizeArchivePath(value: string) {
    const archivePath = resolve(value?.trim() ?? '');
    if (!value?.trim() || extname(archivePath).toLowerCase() !== BACKUP_EXTENSION) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The selected restore file must use the .kmb extension.',
      );
    }
    return archivePath;
  }

  private async createSafetyBackupDestination(activeDatabasePath: string) {
    const directory = join(dirname(dirname(activeDatabasePath)), 'SafetyBackups');
    await mkdir(directory, { recursive: true });
    const date = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const baseName = `KhayatiManager_BeforeRestore_${date.getFullYear()}-${pad(
      date.getMonth() + 1,
    )}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(
      date.getMinutes(),
    )}-${pad(date.getSeconds())}`;
    let destination = join(directory, `${baseName}${BACKUP_EXTENSION}`);
    try {
      await stat(destination);
      destination = join(
        directory,
        `${baseName}-${randomUUID().slice(0, 8)}${BACKUP_EXTENSION}`,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    return destination;
  }
}
