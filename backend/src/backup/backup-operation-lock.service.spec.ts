import { BackupOperationLockService } from './backup-operation-lock.service';

describe('BackupOperationLockService', () => {
  it('prevents backup and restore from running at the same time', () => {
    const lock = new BackupOperationLockService();
    const backupToken = lock.acquire('BACKUP');
    expect(() => lock.acquire('RESTORE')).toThrow(
      expect.objectContaining({ code: 'BACKUP_IN_PROGRESS' }),
    );
    lock.release(backupToken);

    const restoreToken = lock.acquire('RESTORE');
    expect(lock.isRestoreInProgress()).toBe(true);
    expect(() => lock.acquire('BACKUP')).toThrow(
      expect.objectContaining({ code: 'RESTORE_IN_PROGRESS' }),
    );
    lock.release(restoreToken);
    expect(lock.currentOperation()).toBeNull();
  });
});
