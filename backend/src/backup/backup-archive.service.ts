import { Injectable } from '@nestjs/common';
import { createGzip, constants as zlibConstants } from 'node:zlib';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { pack } from 'tar-stream';
import { BACKUP_MANIFEST_PATH } from './backup.constants';
import { BackupManifest, BackupWorkspace } from './backup.types';

@Injectable()
export class BackupArchiveService {
  async packageBackup(workspace: BackupWorkspace, manifest: BackupManifest) {
    const archive = pack();
    const output = createWriteStream(workspace.archivePath, { flags: 'wx' });
    const archivePipeline = pipeline(
      archive,
      createGzip({
        level: 9,
        strategy: zlibConstants.Z_DEFAULT_STRATEGY,
      }),
      output,
    );
    const mtime = new Date(manifest.createdAt);

    try {
      const manifestBytes = Buffer.from(
        `${JSON.stringify(manifest, null, 2)}\n`,
        'utf8',
      );
      await this.addBuffer(archive, BACKUP_MANIFEST_PATH, manifestBytes, mtime);

      for (const file of manifest.files) {
        const sourcePath = this.resolveWorkspaceFile(workspace, file.path);
        const metadata = await stat(sourcePath);
        const entry = archive.entry({
          name: file.path,
          size: metadata.size,
          mode: 0o600,
          mtime,
          type: 'file',
        });
        await pipeline(createReadStream(sourcePath), entry);
      }

      archive.finalize();
      await archivePipeline;
    } catch (error) {
      archive.destroy(
        error instanceof Error ? error : new Error(String(error)),
      );
      await archivePipeline.catch(() => undefined);
      throw error;
    }

    return workspace.archivePath;
  }

  private addBuffer(
    archive: ReturnType<typeof pack>,
    name: string,
    bytes: Buffer,
    mtime: Date,
  ) {
    return new Promise<void>((resolvePromise, reject) => {
      archive.entry(
        {
          name,
          size: bytes.length,
          mode: 0o600,
          mtime,
          type: 'file',
        },
        bytes,
        (error) => (error ? reject(error) : resolvePromise()),
      );
    });
  }

  private resolveWorkspaceFile(
    workspace: BackupWorkspace,
    archivePath: string,
  ) {
    const rootPath = resolve(workspace.rootPath);
    const filePath = resolve(rootPath, ...archivePath.split('/'));
    if (!filePath.startsWith(`${rootPath}${sep}`)) {
      throw new Error(`Invalid backup archive path: ${archivePath}`);
    }
    return filePath;
  }
}
