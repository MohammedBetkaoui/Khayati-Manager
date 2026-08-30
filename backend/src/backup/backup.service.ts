import { Injectable, Logger } from '@nestjs/common';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import {
  constants as fsConstants,
  createReadStream,
  createWriteStream,
  statSync,
} from 'node:fs';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  statfs,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  normalize,
  resolve,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { BackupArchiveService } from './backup-archive.service';
import {
  BACKUP_APPLICATION,
  BACKUP_ARCHIVE_FORMAT,
  BACKUP_DATABASE_PATH,
  BACKUP_EXTENSION,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
} from './backup.constants';
import { BackupError } from './backup.errors';
import { fileMetadata } from './backup-file-utils';
import {
  BackupAssetKind,
  BackupManifest,
  BackupManifestAsset,
  BackupManifestFile,
  BackupWarning,
  CreateBackupOptions,
  CreateBackupResult,
  InspectBackupOptions,
  SnapshotInspection,
  ValidatedBackup,
} from './backup.types';
import { BackupValidationService } from './backup-validation.service';
import { BackupWorkspaceService } from './backup-workspace.service';
import { resolveDatabasePath } from '../database/database-options';
import { CURRENT_SCHEMA_VERSION } from '../database/schema-version';
import { BackupOperationLockService } from './backup-operation-lock.service';

type CollectedAssets = {
  assets: BackupManifestAsset[];
  files: BackupManifestFile[];
  warnings: BackupWarning[];
};

type AssetDefinition = {
  kind: BackupAssetKind;
  databaseField: 'logoPath' | 'stampPath';
  value: string | null;
  archiveBaseName: string;
};

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly archiveService: BackupArchiveService,
    private readonly validationService: BackupValidationService,
    private readonly workspaceService: BackupWorkspaceService,
    private readonly operationLock: BackupOperationLockService,
  ) {}

  async createBackup(
    options: CreateBackupOptions,
  ): Promise<CreateBackupResult> {
    const ownsOperationLock = !options.operationToken;
    const operationToken =
      options.operationToken ?? this.operationLock.acquire('BACKUP');
    if (options.operationToken) {
      this.operationLock.assertRestoreToken(options.operationToken);
    }

    const databasePath = resolve(
      options.databasePath ?? resolveDatabasePath(process.env),
    );
    const destinationPath = this.normalizeDestination(options.destinationPath);
    const tempRootPath = resolve(
      options.tempRootPath ?? join(dirname(dirname(databasePath)), 'temp'),
    );
    const createdAt = options.createdAt ?? new Date();
    let workspace:
      | Awaited<ReturnType<BackupWorkspaceService['createBackupWorkspace']>>
      | undefined;
    let destinationCreated = false;

    try {
      await this.validateSourceAndDestination(databasePath, destinationPath);
      workspace =
        await this.workspaceService.createBackupWorkspace(tempRootPath);
      const snapshotPath = join(workspace.databaseDirectory, 'khayati.sqlite');

      await this.createDatabaseSnapshot(databasePath, snapshotPath);
      const snapshot = this.validationService.validateDatabaseSnapshot(
        snapshotPath,
        CURRENT_SCHEMA_VERSION,
      );
      const databaseMetadata = await fileMetadata(snapshotPath);
      const collectedAssets = await this.collectRequiredAssets(
        snapshot,
        workspace.assetsDirectory,
      );
      const databaseFile: BackupManifestFile = {
        path: BACKUP_DATABASE_PATH,
        kind: 'DATABASE',
        ...databaseMetadata,
      };
      const manifest: BackupManifest = {
        format: BACKUP_FORMAT,
        backupFormatVersion: BACKUP_FORMAT_VERSION,
        archiveFormat: BACKUP_ARCHIVE_FORMAT,
        application: BACKUP_APPLICATION,
        appVersion: await this.resolveAppVersion(options.appVersion),
        schemaVersion: CURRENT_SCHEMA_VERSION,
        sqliteUserVersion: snapshot.sqliteUserVersion,
        createdAt: createdAt.toISOString(),
        settingsSource: 'SQLITE',
        encryption: { mode: 'NONE' },
        database: {
          path: BACKUP_DATABASE_PATH,
          ...databaseMetadata,
        },
        assets: collectedAssets.assets,
        files: [databaseFile, ...collectedAssets.files],
        warnings: collectedAssets.warnings,
        statistics: snapshot.statistics,
      };

      await writeFile(
        workspace.manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
        { encoding: 'utf8', flag: 'wx' },
      );
      await this.archiveService.packageBackup(workspace, manifest);
      await this.validationService.validateBackupArchive(
        workspace.archivePath,
        join(workspace.rootPath, 'validation-staged'),
      );

      await this.copyArchiveAtomically(workspace.archivePath, destinationPath);
      destinationCreated = true;
      const validated = await this.validationService.validateBackupArchive(
        destinationPath,
        join(workspace.rootPath, 'validation-final'),
      );

      this.logger.log('Backup created successfully.');
      return {
        filePath: destinationPath,
        fileName: basename(destinationPath),
        size: validated.archiveSize,
        sha256: validated.archiveSha256,
        manifest: validated.manifest,
      };
    } catch (error) {
      if (destinationCreated) {
        await rm(destinationPath, { force: true }).catch(() => undefined);
      }
      this.logger.error('Backup creation failed.');
      if (error instanceof BackupError) throw error;
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup could not be created.',
        { cause: error },
      );
    } finally {
      try {
        if (workspace) {
          await this.workspaceService.cleanupBackupWorkspace(workspace);
        }
      } finally {
        if (ownsOperationLock) {
          this.operationLock.release(operationToken);
        }
      }
    }
  }

  createSuggestedFileName(date = new Date()) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `KhayatiManager_Backup_${date.getFullYear()}-${pad(
      date.getMonth() + 1,
    )}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(
      date.getMinutes(),
    )}${BACKUP_EXTENSION}`;
  }

  async inspectBackup(options: InspectBackupOptions): Promise<ValidatedBackup> {
    const archivePath = this.normalizeBackupFilePath(options.filePath);
    const databasePath = resolveDatabasePath(process.env);
    const tempRootPath = resolve(
      options.tempRootPath ?? join(dirname(dirname(databasePath)), 'temp'),
    );
    const inspectionPath = join(
      tempRootPath,
      `backup-inspection-${randomUUID()}`,
    );

    try {
      const archiveMetadata = await stat(archivePath);
      if (!archiveMetadata.isFile() || archiveMetadata.size <= 0) {
        throw new BackupError(
          'ARCHIVE_INVALID',
          'The selected backup file is empty or invalid.',
        );
      }
      await mkdir(tempRootPath, { recursive: true });
      await mkdir(inspectionPath, { recursive: false });
      return await this.validationService.validateBackupArchive(
        archivePath,
        join(inspectionPath, 'extracted'),
      );
    } catch (error) {
      if (error instanceof BackupError) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      throw new BackupError(
        code === 'ENOENT' ? 'ARCHIVE_INVALID' : 'DESTINATION_UNAVAILABLE',
        code === 'ENOENT'
          ? 'The selected backup file was not found.'
          : 'The selected backup file could not be inspected.',
        { cause: error },
      );
    } finally {
      await rm(inspectionPath, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }

  private async createDatabaseSnapshot(
    sourcePath: string,
    snapshotPath: string,
  ) {
    const source = new Database(sourcePath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      await source.backup(snapshotPath);
    } catch (error) {
      throw new BackupError(
        'DATABASE_INVALID',
        'A consistent SQLite snapshot could not be created.',
        { cause: error },
      );
    } finally {
      source.close();
    }

    const snapshotMetadata = await stat(snapshotPath);
    if (!snapshotMetadata.isFile() || snapshotMetadata.size <= 0) {
      throw new BackupError(
        'DATABASE_INVALID',
        'The SQLite snapshot is empty.',
      );
    }
  }

  private async collectRequiredAssets(
    snapshot: SnapshotInspection,
    assetsDirectory: string,
  ): Promise<CollectedAssets> {
    const definitions: AssetDefinition[] = [
      {
        kind: 'WORKSHOP_LOGO',
        databaseField: 'logoPath',
        value: snapshot.configuredAssets.logoPath,
        archiveBaseName: 'workshop-logo',
      },
      {
        kind: 'WORKSHOP_STAMP',
        databaseField: 'stampPath',
        value: snapshot.configuredAssets.stampPath,
        archiveBaseName: 'workshop-stamp',
      },
    ];
    const result: CollectedAssets = { assets: [], files: [], warnings: [] };

    for (const definition of definitions) {
      if (!definition.value || definition.value.startsWith('data:image/')) {
        continue;
      }
      if (/^https?:\/\//i.test(definition.value)) {
        result.warnings.push({
          code: 'ASSET_NOT_LOCAL',
          assetKind: definition.kind,
          message: `${definition.kind} is configured as a remote resource and was not included.`,
        });
        continue;
      }

      const sourcePath = this.resolveConfiguredAssetPath(definition.value);
      if (!sourcePath) {
        result.warnings.push({
          code: 'ASSET_MISSING',
          assetKind: definition.kind,
          message: `${definition.kind} is configured but the local file is missing.`,
        });
        continue;
      }
      let sourceMetadata;
      try {
        sourceMetadata = await stat(sourcePath);
      } catch {
        result.warnings.push({
          code: 'ASSET_MISSING',
          assetKind: definition.kind,
          message: `${definition.kind} is configured but the local file is missing.`,
        });
        continue;
      }
      if (!sourceMetadata.isFile()) {
        result.warnings.push({
          code: 'ASSET_NOT_FILE',
          assetKind: definition.kind,
          message: `${definition.kind} does not reference a regular file.`,
        });
        continue;
      }

      const extension = this.safeAssetExtension(sourcePath);
      const archivePath = `assets/${definition.archiveBaseName}${extension}`;
      const destinationPath = join(
        assetsDirectory,
        `${definition.archiveBaseName}${extension}`,
      );
      try {
        await copyFile(sourcePath, destinationPath, fsConstants.COPYFILE_EXCL);
      } catch {
        result.warnings.push({
          code: 'ASSET_UNREADABLE',
          assetKind: definition.kind,
          message: `${definition.kind} could not be read and was not included.`,
        });
        continue;
      }
      const metadata = await fileMetadata(destinationPath);
      result.assets.push({
        kind: definition.kind,
        databaseField: definition.databaseField,
        path: archivePath,
        originalFileName: basename(sourcePath),
        mediaType: this.assetMediaType(extension),
      });
      result.files.push({
        path: archivePath,
        kind: 'ASSET',
        ...metadata,
      });
    }
    return result;
  }

  private resolveConfiguredAssetPath(value: string) {
    let cleanPath = value;
    if (value.startsWith('file://')) {
      try {
        cleanPath = fileURLToPath(value);
      } catch {
        return null;
      }
    }
    if (isAbsolute(cleanPath)) {
      return normalize(cleanPath);
    }

    const resourcesPath = (
      process as NodeJS.Process & { resourcesPath?: string }
    ).resourcesPath;
    const candidates = [
      join(process.cwd(), cleanPath),
      join(dirname(process.execPath), cleanPath),
      resourcesPath ? join(resourcesPath, cleanPath) : null,
    ].filter((path): path is string => Boolean(path));
    return (
      candidates.find((path) => {
        try {
          return statSync(path).isFile();
        } catch {
          return false;
        }
      }) ?? null
    );
  }

  private normalizeDestination(value: string) {
    if (!value?.trim()) {
      throw new BackupError(
        'DESTINATION_INVALID',
        'A backup destination is required.',
      );
    }
    const destinationPath = resolve(value.trim());
    if (extname(destinationPath).toLowerCase() !== BACKUP_EXTENSION) {
      throw new BackupError(
        'DESTINATION_INVALID',
        'The backup destination must use the .kmb extension.',
      );
    }
    return destinationPath;
  }

  private normalizeBackupFilePath(value: string) {
    if (!value?.trim()) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'A backup file path is required.',
      );
    }
    const filePath = resolve(value.trim());
    if (extname(filePath).toLowerCase() !== BACKUP_EXTENSION) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The selected file must use the .kmb extension.',
      );
    }
    return filePath;
  }

  private async validateSourceAndDestination(
    databasePath: string,
    destinationPath: string,
  ) {
    let databaseMetadata;
    try {
      databaseMetadata = await stat(databasePath);
    } catch (error) {
      throw new BackupError(
        'DATABASE_NOT_FOUND',
        'The active SQLite database was not found.',
        { cause: error },
      );
    }
    if (!databaseMetadata.isFile() || databaseMetadata.size <= 0) {
      throw new BackupError(
        'DATABASE_INVALID',
        'The active SQLite database is invalid.',
      );
    }

    try {
      await access(dirname(destinationPath), fsConstants.W_OK);
    } catch (error) {
      throw new BackupError(
        'DESTINATION_UNAVAILABLE',
        'The backup destination is unavailable or not writable.',
        { cause: error },
      );
    }
    try {
      await stat(destinationPath);
      throw new BackupError(
        'DESTINATION_EXISTS',
        'A backup with this name already exists.',
      );
    } catch (error) {
      if (error instanceof BackupError) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }
  }

  private async copyArchiveAtomically(
    sourcePath: string,
    destinationPath: string,
  ) {
    const sourceMetadata = await stat(sourcePath);
    await this.ensureAvailableSpace(
      dirname(destinationPath),
      sourceMetadata.size,
    );
    const partialPath = join(
      dirname(destinationPath),
      `.${basename(destinationPath)}.partial-${randomUUID()}`,
    );

    try {
      await pipeline(
        createReadStream(sourcePath),
        createWriteStream(partialPath, { flags: 'wx' }),
      );
      const [sourceFile, copiedFile] = await Promise.all([
        fileMetadata(sourcePath),
        fileMetadata(partialPath),
      ]);
      if (
        sourceFile.size !== copiedFile.size ||
        sourceFile.sha256 !== copiedFile.sha256
      ) {
        throw new BackupError(
          'CHECKSUM_MISMATCH',
          'The backup changed while being written to its destination.',
        );
      }
      await rename(partialPath, destinationPath);
    } catch (error) {
      await rm(partialPath, { force: true }).catch(() => undefined);
      if (error instanceof BackupError) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      throw new BackupError(
        code === 'ENOSPC' ? 'INSUFFICIENT_SPACE' : 'DESTINATION_UNAVAILABLE',
        code === 'ENOSPC'
          ? 'There is not enough free space to save the backup.'
          : 'The backup destination became unavailable during writing.',
        { cause: error },
      );
    }
  }

  private async ensureAvailableSpace(directory: string, requiredBytes: number) {
    try {
      const storage = await statfs(directory, { bigint: true });
      const availableBytes = storage.bavail * storage.bsize;
      if (availableBytes < BigInt(requiredBytes)) {
        throw new BackupError(
          'INSUFFICIENT_SPACE',
          'There is not enough free space to save the backup.',
        );
      }
    } catch (error) {
      if (error instanceof BackupError) throw error;
      // Some filesystems do not expose free-space information. The exclusive
      // streaming write remains the final source of truth in that case.
    }
  }

  private safeAssetExtension(filePath: string) {
    const extension = extname(filePath).toLowerCase();
    return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '.bin';
  }

  private assetMediaType(extension: string) {
    const mediaTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    return mediaTypes[extension] ?? null;
  }

  private async resolveAppVersion(explicitVersion?: string) {
    const configuredVersion =
      explicitVersion?.trim() || process.env.KHAYATI_APP_VERSION?.trim();
    if (configuredVersion) return configuredVersion;

    const candidates = [
      join(process.cwd(), 'package.json'),
      join(__dirname, '..', '..', '..', 'package.json'),
      join(__dirname, '..', '..', 'package.json'),
    ];
    for (const candidate of candidates) {
      try {
        const packageJson = JSON.parse(await readFile(candidate, 'utf8')) as {
          version?: string;
        };
        if (packageJson.version?.trim()) return packageJson.version.trim();
      } catch {
        // Try the next packaged/development location.
      }
    }
    return 'unknown';
  }
}
