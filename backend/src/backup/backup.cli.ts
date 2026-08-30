import { BackupArchiveService } from './backup-archive.service';
import { BackupService } from './backup.service';
import { BackupValidationService } from './backup-validation.service';
import { BackupWorkspaceService } from './backup-workspace.service';
import { BackupOperationLockService } from './backup-operation-lock.service';

async function main() {
  const destinationPath = process.argv[2];
  if (!destinationPath) {
    throw new Error(
      'Usage: npm run backup:create -- "C:\\path\\KhayatiManager_Backup_YYYY-MM-DD_HH-mm.kmb"',
    );
  }

  const service = new BackupService(
    new BackupArchiveService(),
    new BackupValidationService(),
    new BackupWorkspaceService(),
    new BackupOperationLockService(),
  );
  const result = await service.createBackup({ destinationPath });
  process.stdout.write(
    `Backup created: ${result.fileName} (${result.size} bytes)\n`,
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `Backup failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
