import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { BACKUP_MANIFEST_PATH } from './backup.constants';
import { BackupWorkspace } from './backup.types';

@Injectable()
export class BackupWorkspaceService {
  async createBackupWorkspace(tempRootPath: string): Promise<BackupWorkspace> {
    const resolvedTempRoot = resolve(tempRootPath);
    await mkdir(resolvedTempRoot, { recursive: true });
    const rootPath = join(resolvedTempRoot, `backup-${randomUUID()}`);
    const databaseDirectory = join(rootPath, 'database');
    const assetsDirectory = join(rootPath, 'assets');

    await mkdir(rootPath, { recursive: false });
    await mkdir(databaseDirectory, { recursive: false });
    await mkdir(assetsDirectory, { recursive: false });

    return {
      tempRootPath: resolvedTempRoot,
      rootPath,
      databaseDirectory,
      assetsDirectory,
      manifestPath: join(rootPath, BACKUP_MANIFEST_PATH),
      archivePath: join(rootPath, 'backup.kmb'),
    };
  }

  async cleanupBackupWorkspace(workspace: BackupWorkspace) {
    const tempRootPath = resolve(workspace.tempRootPath);
    const rootPath = resolve(workspace.rootPath);
    if (
      dirname(rootPath) !== tempRootPath ||
      !basename(rootPath).startsWith('backup-')
    ) {
      throw new Error('Refusing to clean an invalid backup workspace path.');
    }

    await rm(rootPath, { recursive: true, force: true });
  }
}
