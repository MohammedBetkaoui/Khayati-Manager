import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BackupError } from './backup.errors';

type BackupOperation = 'BACKUP' | 'RESTORE' | 'RESTORE_COMPLETE';

@Injectable()
export class BackupOperationLockService {
  private active: { token: string; operation: BackupOperation } | null = null;

  acquire(operation: 'BACKUP' | 'RESTORE') {
    if (this.active) {
      throw new BackupError(
        this.active.operation === 'BACKUP'
          ? 'BACKUP_IN_PROGRESS'
          : 'RESTORE_IN_PROGRESS',
        'A backup or restore operation is already in progress.',
      );
    }
    const token = randomUUID();
    this.active = { token, operation };
    return token;
  }

  assertRestoreToken(token: string) {
    if (
      !this.active ||
      this.active.token !== token ||
      this.active.operation !== 'RESTORE'
    ) {
      throw new BackupError(
        'RESTORE_IN_PROGRESS',
        'The restore operation token is no longer valid.',
      );
    }
  }

  markRestoreComplete(token: string) {
    this.assertRestoreToken(token);
    this.active = { token, operation: 'RESTORE_COMPLETE' };
  }

  release(token: string) {
    if (this.active?.token === token) this.active = null;
  }

  isRestoreInProgress() {
    return (
      this.active?.operation === 'RESTORE' ||
      this.active?.operation === 'RESTORE_COMPLETE'
    );
  }

  currentOperation() {
    return this.active?.operation ?? null;
  }
}
