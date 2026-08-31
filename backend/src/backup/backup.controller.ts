import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BackupError, type BackupErrorCode } from './backup.errors';
import { BackupService } from './backup.service';
import { DesktopBackupGuard } from './desktop-backup.guard';
import { CreateDesktopBackupDto } from './dto/create-desktop-backup.dto';
import { InspectDesktopBackupDto } from './dto/inspect-desktop-backup.dto';
import { RestoreDesktopBackupDto } from './dto/restore-desktop-backup.dto';
import { BackupRestoreService } from './backup-restore.service';
import { RestoreProgressService } from './restore-progress.service';
import { BackupSchedulerService } from './backup-scheduler.service';
import { BackupCatalogService } from './backup-catalog.service';
import { CreateAutomaticBackupDto } from './dto/create-automatic-backup.dto';
import { DeleteLocalBackupDto } from './dto/delete-local-backup.dto';

@Controller('desktop-backup')
@UseGuards(DesktopBackupGuard)
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly restoreService: BackupRestoreService,
    private readonly restoreProgress: RestoreProgressService,
    private readonly schedulerService: BackupSchedulerService,
    private readonly catalogService: BackupCatalogService,
  ) {}

  @Post('create')
  async create(@Body() body: CreateDesktopBackupDto) {
    try {
      const result = await this.backupService.createBackup({
        destinationPath: body.destinationPath,
        appVersion: body.appVersion,
      });
      return {
        success: true,
        fileName: result.fileName,
        size: result.size,
        createdAt: result.manifest.createdAt,
        warnings: result.manifest.warnings.map((warning) => ({
          code: warning.code,
          assetKind: warning.assetKind,
        })),
      };
    } catch (error) {
      this.rethrowSafeError(error);
    }
  }

  @Post('inspect')
  async inspect(@Body() body: InspectDesktopBackupDto) {
    try {
      const result = await this.backupService.inspectBackup({
        filePath: body.filePath,
      });
      return {
        success: true,
        fileName: body.filePath.split(/[\\/]/).pop(),
        size: result.archiveSize,
        createdAt: result.manifest.createdAt,
        appVersion: result.manifest.appVersion,
        schemaVersion: result.manifest.schemaVersion,
        statistics: result.manifest.statistics,
        warnings: result.manifest.warnings.map((warning) => ({
          code: warning.code,
          assetKind: warning.assetKind,
        })),
      };
    } catch (error) {
      this.rethrowSafeError(error);
    }
  }

  @Post('restore')
  async restore(@Body() body: RestoreDesktopBackupDto) {
    try {
      const result = await this.restoreService.restoreBackup({
        filePath: body.filePath,
        appVersion: body.appVersion,
      });
      return { success: true, ...result };
    } catch (error) {
      this.rethrowSafeError(error);
    }
  }

  @Get('restore-status')
  restoreStatus() {
    return { success: true, ...this.restoreProgress.getProgress() };
  }

  @Post('automatic/run')
  async runAutomatic(@Body() body: CreateAutomaticBackupDto) {
    try {
      const result = await this.schedulerService.runDailyAutomaticBackup({
        retention: body.retention,
        appVersion: body.appVersion,
      });
      return { success: true, ...result };
    } catch (error) {
      this.rethrowSafeError(error);
    }
  }

  @Post('automatic/retention')
  async applyRetention(@Body() body: CreateAutomaticBackupDto) {
    try {
      return {
        success: true,
        ...(await this.catalogService.applyAutomaticRetention(body.retention)),
      };
    } catch (error) {
      this.rethrowSafeError(error);
    }
  }

  @Get('catalog')
  async catalog() {
    try {
      const [history, totalSize] = await Promise.all([
        this.catalogService.listLocalBackups(5),
        this.catalogService.totalLocalBackupSize(),
      ]);
      return {
        success: true,
        history,
        totalSize,
        hasImportantData: this.catalogService.hasImportantData(),
      };
    } catch (error) {
      this.rethrowSafeError(error);
    }
  }

  @Post('catalog/delete')
  async deleteLocal(@Body() body: DeleteLocalBackupDto) {
    try {
      await this.catalogService.deleteKnownLocalBackup(body.filePath);
      return { success: true };
    } catch (error) {
      this.rethrowSafeError(error);
    }
  }

  private rethrowSafeError(error: unknown): never {
    if (error instanceof BackupError) {
      throw new HttpException(
        { errorCode: error.code },
        this.statusFor(error.code),
      );
    }
    throw new HttpException(
      { errorCode: 'BACKUP_UNKNOWN' },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private statusFor(code: BackupErrorCode) {
    const statuses: Partial<Record<BackupErrorCode, HttpStatus>> = {
      BACKUP_IN_PROGRESS: HttpStatus.CONFLICT,
      RESTORE_IN_PROGRESS: HttpStatus.CONFLICT,
      DESTINATION_EXISTS: HttpStatus.CONFLICT,
      SCHEMA_VERSION_MISMATCH: HttpStatus.CONFLICT,
      DESTINATION_INVALID: HttpStatus.UNPROCESSABLE_ENTITY,
      DESTINATION_UNAVAILABLE: HttpStatus.UNPROCESSABLE_ENTITY,
      INSUFFICIENT_SPACE: HttpStatus.INSUFFICIENT_STORAGE,
      ARCHIVE_INVALID: HttpStatus.UNPROCESSABLE_ENTITY,
      CHECKSUM_MISMATCH: HttpStatus.UNPROCESSABLE_ENTITY,
      DATABASE_INVALID: HttpStatus.UNPROCESSABLE_ENTITY,
      DATABASE_NOT_FOUND: HttpStatus.UNPROCESSABLE_ENTITY,
      FOREIGN_KEY_VIOLATION: HttpStatus.UNPROCESSABLE_ENTITY,
      CRITICAL_TABLE_MISSING: HttpStatus.UNPROCESSABLE_ENTITY,
      SAFETY_BACKUP_FAILED: HttpStatus.INTERNAL_SERVER_ERROR,
      RESTORE_FAILED: HttpStatus.INTERNAL_SERVER_ERROR,
      RESTORE_SWAP_FAILED: HttpStatus.INTERNAL_SERVER_ERROR,
      RESTORE_ROLLBACK_FAILED: HttpStatus.INTERNAL_SERVER_ERROR,
    };
    return statuses[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
