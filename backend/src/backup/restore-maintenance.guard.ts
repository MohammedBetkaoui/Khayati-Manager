import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { BackupOperationLockService } from './backup-operation-lock.service';

@Injectable()
export class RestoreMaintenanceGuard implements CanActivate {
  constructor(private readonly operationLock: BackupOperationLockService) {}

  canActivate(context: ExecutionContext) {
    if (!this.operationLock.isRestoreInProgress()) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path;
    if (
      path === '/desktop-backup/restore' ||
      path === '/desktop-backup/restore-status'
    ) {
      return true;
    }
    throw new ServiceUnavailableException({
      errorCode: 'RESTORE_IN_PROGRESS',
    });
  }
}
