import { Module } from '@nestjs/common';
import { BackupArchiveService } from './backup-archive.service';
import { BackupService } from './backup.service';
import { BackupValidationService } from './backup-validation.service';
import { BackupWorkspaceService } from './backup-workspace.service';
import { BackupController } from './backup.controller';
import { DesktopBackupGuard } from './desktop-backup.guard';
import { APP_GUARD } from '@nestjs/core';
import { BackupOperationLockService } from './backup-operation-lock.service';
import { BackupRestoreService } from './backup-restore.service';
import { RestoreAssetsService } from './restore-assets.service';
import { RestoreMaintenanceGuard } from './restore-maintenance.guard';
import { RestoreMigrationService } from './restore-migration.service';
import { RestoreProgressService } from './restore-progress.service';
import { RestoreSwapService } from './restore-swap.service';
import { RestoreValidationService } from './restore-validation.service';
import { RestoreWorkspaceService } from './restore-workspace.service';

@Module({
  controllers: [BackupController],
  providers: [
    BackupService,
    BackupArchiveService,
    BackupValidationService,
    BackupWorkspaceService,
    BackupOperationLockService,
    BackupRestoreService,
    RestoreAssetsService,
    RestoreMigrationService,
    RestoreProgressService,
    RestoreSwapService,
    RestoreValidationService,
    RestoreWorkspaceService,
    DesktopBackupGuard,
    RestoreMaintenanceGuard,
    {
      provide: APP_GUARD,
      useExisting: RestoreMaintenanceGuard,
    },
  ],
  exports: [
    BackupService,
    BackupValidationService,
    BackupOperationLockService,
  ],
})
export class BackupModule {}
