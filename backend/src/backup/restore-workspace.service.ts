import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type { RestoreWorkspace } from './backup.types';

@Injectable()
export class RestoreWorkspaceService {
  async createRestoreWorkspace(tempRootPath: string): Promise<RestoreWorkspace> {
    const resolvedTempRoot = resolve(tempRootPath);
    await mkdir(resolvedTempRoot, { recursive: true });
    const id = randomUUID();
    const rootPath = join(resolvedTempRoot, `restore-${id}`);
    const extractedDirectory = join(rootPath, 'extracted');
    const databaseDirectory = join(rootPath, 'database');
    await mkdir(rootPath, { recursive: false });
    await mkdir(databaseDirectory, { recursive: false });
    return {
      id,
      tempRootPath: resolvedTempRoot,
      rootPath,
      extractedDirectory,
      databaseDirectory,
      temporaryDatabasePath: join(databaseDirectory, 'khayati.restore.sqlite'),
    };
  }

  async cleanupRestoreWorkspace(workspace: RestoreWorkspace) {
    const tempRootPath = resolve(workspace.tempRootPath);
    const rootPath = resolve(workspace.rootPath);
    if (
      dirname(rootPath) !== tempRootPath ||
      !basename(rootPath).startsWith('restore-')
    ) {
      throw new Error('Refusing to clean an invalid restore workspace path.');
    }
    await rm(rootPath, { recursive: true, force: true });
  }
}
