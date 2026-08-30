import { Injectable } from '@nestjs/common';
import type { BackupErrorCode } from './backup.errors';
import type { RestoreProgress, RestoreProgressStep } from './backup.types';

@Injectable()
export class RestoreProgressService {
  private state: RestoreProgress = { active: false, step: 'IDLE' };

  start() {
    const now = new Date().toISOString();
    this.state = {
      active: true,
      step: 'VALIDATING',
      startedAt: now,
      updatedAt: now,
    };
  }

  setStep(step: RestoreProgressStep) {
    this.state = {
      ...this.state,
      active: !['COMPLETE', 'FAILED', 'IDLE'].includes(step),
      step,
      updatedAt: new Date().toISOString(),
      errorCode: undefined,
    };
  }

  fail(errorCode: BackupErrorCode) {
    this.state = {
      ...this.state,
      active: false,
      step: 'FAILED',
      errorCode,
      updatedAt: new Date().toISOString(),
    };
  }

  getProgress(): RestoreProgress {
    return { ...this.state };
  }
}
