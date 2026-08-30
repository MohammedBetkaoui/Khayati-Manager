import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { copyFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileMetadata } from './backup-file-utils';
import { BackupError } from './backup.errors';
import type { BackupManifest } from './backup.types';

export type InstalledRestoreAsset = { filePath: string; created: boolean };

@Injectable()
export class RestoreAssetsService {
  async preparePortableAssets(
    temporaryDatabasePath: string,
    extractedDirectory: string,
    activeDatabasePath: string,
    manifest: BackupManifest,
  ) {
    const userDataRoot = dirname(dirname(activeDatabasePath));
    const finalDirectory = join(userDataRoot, 'assets', 'workshop');
    await mkdir(finalDirectory, { recursive: true });
    const installed: InstalledRestoreAsset[] = [];
    const fieldValues: Record<'logoPath' | 'stampPath', string | null> = {
      logoPath: null,
      stampPath: null,
    };

    try {
      for (const asset of manifest.assets) {
        const file = manifest.files.find(
          (entry) => entry.kind === 'ASSET' && entry.path === asset.path,
        );
        if (!file) {
          throw new BackupError(
            'ARCHIVE_INVALID',
            'The restored asset is missing from the manifest file list.',
          );
        }
        const extension = this.safeExtension(asset.path);
        const prefix = asset.kind === 'WORKSHOP_LOGO' ? 'logo' : 'stamp';
        const finalPath = join(
          finalDirectory,
          `${prefix}-${file.sha256.slice(0, 20)}${extension}`,
        );
        const sourcePath = join(extractedDirectory, ...asset.path.split('/'));
        const alreadyPresent = await this.matchesExpectedFile(finalPath, file);
        if (!alreadyPresent) {
          const partialPath = `${finalPath}.partial-${randomUUID()}`;
          try {
            await copyFile(sourcePath, partialPath, fsConstants.COPYFILE_EXCL);
            const copied = await fileMetadata(partialPath);
            if (copied.size !== file.size || copied.sha256 !== file.sha256) {
              throw new BackupError(
                'CHECKSUM_MISMATCH',
                'A restored workshop asset failed its final checksum.',
              );
            }
            await rename(partialPath, finalPath);
            installed.push({ filePath: finalPath, created: true });
          } finally {
            await rm(partialPath, { force: true }).catch(() => undefined);
          }
        } else {
          installed.push({ filePath: finalPath, created: false });
        }
        fieldValues[asset.databaseField] = finalPath;
      }

      this.updateDatabaseAssetPaths(temporaryDatabasePath, fieldValues);
      return installed;
    } catch (error) {
      await this.cleanupPreparedAssets(installed);
      if (error instanceof BackupError) throw error;
      throw new BackupError(
        'RESTORE_FAILED',
        'Workshop assets could not be prepared safely.',
        { cause: error },
      );
    }
  }

  async cleanupPreparedAssets(installed: InstalledRestoreAsset[]) {
    await Promise.all(
      installed
        .filter((asset) => asset.created)
        .map((asset) => rm(asset.filePath, { force: true }).catch(() => undefined)),
    );
  }

  private updateDatabaseAssetPaths(
    databasePath: string,
    values: Record<'logoPath' | 'stampPath', string | null>,
  ) {
    const database = new Database(databasePath);
    try {
      const hasSettings = database
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'workshop_settings'",
        )
        .get();
      if (!hasSettings) return;

      const current = database
        .prepare(
          'SELECT id, logoPath, stampPath FROM workshop_settings ORDER BY id ASC LIMIT 1',
        )
        .get() as
        | {
            id: number;
            logoPath: string | null;
            stampPath: string | null;
          }
        | undefined;
      if (!current) return;

      const portableValue = (restored: string | null, existing: string | null) =>
        restored ?? (existing?.startsWith('data:image/') ? existing : null);
      database
        .prepare(
          'UPDATE workshop_settings SET logoPath = ?, stampPath = ? WHERE id = ?',
        )
        .run(
          portableValue(values.logoPath, current.logoPath),
          portableValue(values.stampPath, current.stampPath),
          current.id,
        );
    } finally {
      database.close();
    }
  }

  private async matchesExpectedFile(
    filePath: string,
    expected: { size: number; sha256: string },
  ) {
    try {
      const metadata = await stat(filePath);
      if (!metadata.isFile()) return false;
      const actual = await fileMetadata(filePath);
      if (actual.size !== expected.size || actual.sha256 !== expected.sha256) {
        throw new BackupError(
          'CHECKSUM_MISMATCH',
          'An existing restored asset has unexpected content.',
        );
      }
      return true;
    } catch (error) {
      if (error instanceof BackupError) throw error;
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  private safeExtension(value: string) {
    const extension = extname(value).toLowerCase();
    return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '.bin';
  }
}
