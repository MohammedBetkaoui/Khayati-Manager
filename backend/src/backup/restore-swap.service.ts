import { Injectable } from '@nestjs/common';
import { constants as fsConstants } from 'node:fs';
import { copyFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { BackupError } from './backup.errors';

export type DatabaseSwapReceipt = {
  activeDatabasePath: string;
  previousDatabasePath: string;
  stagedDatabasePath: string;
};

@Injectable()
export class RestoreSwapService {
  async prepareDatabase(
    temporaryDatabasePath: string,
    activeDatabasePath: string,
    restoreId: string,
  ) {
    const stagedDatabasePath = join(
      dirname(activeDatabasePath),
      `khayati.restore-${restoreId}.sqlite`,
    );
    try {
      await this.copyFileExclusive(temporaryDatabasePath, stagedDatabasePath);
      return stagedDatabasePath;
    } catch (error) {
      await this.removeFile(stagedDatabasePath);
      throw new BackupError(
        'RESTORE_SWAP_FAILED',
        'The restored database could not be staged beside the active database.',
        { cause: error },
      );
    }
  }

  async activateDatabase(
    activeDatabasePath: string,
    stagedDatabasePath: string,
    restoreId: string,
  ): Promise<DatabaseSwapReceipt> {
    await this.assertNoActiveSidecar(activeDatabasePath);
    const previousDatabasePath = join(
      dirname(activeDatabasePath),
      `khayati.before-restore-${restoreId}.sqlite`,
    );
    await this.renameFile(activeDatabasePath, previousDatabasePath);
    try {
      await this.renameFile(stagedDatabasePath, activeDatabasePath);
    } catch (error) {
      try {
        await this.renameFile(previousDatabasePath, activeDatabasePath);
      } catch (rollbackError) {
        throw new BackupError(
          'RESTORE_ROLLBACK_FAILED',
          'The database swap and its immediate rollback both failed.',
          { cause: rollbackError },
        );
      }
      throw new BackupError(
        'RESTORE_SWAP_FAILED',
        'The restored database could not replace the active database.',
        { cause: error },
      );
    }
    return {
      activeDatabasePath,
      previousDatabasePath,
      stagedDatabasePath,
    };
  }

  async rollbackDatabase(receipt: DatabaseSwapReceipt) {
    const failedRestorePath = `${receipt.activeDatabasePath}.failed-restore`;
    try {
      await this.removeFile(failedRestorePath);
      await this.renameFile(receipt.activeDatabasePath, failedRestorePath);
      await this.renameFile(
        receipt.previousDatabasePath,
        receipt.activeDatabasePath,
      );
      await this.removeFile(failedRestorePath);
    } catch (error) {
      throw new BackupError(
        'RESTORE_ROLLBACK_FAILED',
        'The previous database could not be restored after a failed swap.',
        { cause: error },
      );
    }
  }

  async finalizeDatabase(receipt: DatabaseSwapReceipt) {
    await this.removeFile(receipt.previousDatabasePath);
    await this.removeFile(receipt.stagedDatabasePath);
  }

  async cleanupPreparedDatabase(stagedDatabasePath: string | undefined) {
    if (stagedDatabasePath) await this.removeFile(stagedDatabasePath);
  }

  protected copyFileExclusive(source: string, destination: string) {
    return copyFile(source, destination, fsConstants.COPYFILE_EXCL);
  }

  protected renameFile(source: string, destination: string) {
    return rename(source, destination);
  }

  protected removeFile(filePath: string) {
    return rm(filePath, { force: true });
  }

  private async assertNoActiveSidecar(databasePath: string) {
    for (const suffix of ['-wal', '-shm', '-journal']) {
      try {
        const metadata = await stat(`${databasePath}${suffix}`);
        if (metadata.size > 0) {
          throw new BackupError(
            'RESTORE_SWAP_FAILED',
            'SQLite still has an active journal or WAL file.',
          );
        }
      } catch (error) {
        if (error instanceof BackupError) throw error;
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }
}
