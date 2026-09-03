import { createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { pack } from 'tar-stream';
import { BackupValidationService } from './backup-validation.service';

async function createArchive(
  filePath: string,
  entries: Array<{
    name: string;
    content?: string;
    type?: 'file' | 'symlink';
    linkname?: string;
  }>,
) {
  const archive = pack();
  const writing = pipeline(archive, createGzip(), createWriteStream(filePath));
  for (const entry of entries) {
    const bytes = Buffer.from(entry.content ?? '', 'utf8');
    await new Promise<void>((resolvePromise, reject) => {
      archive.entry(
        {
          name: entry.name,
          type: entry.type ?? 'file',
          linkname: entry.linkname,
          size: entry.type === 'symlink' ? 0 : bytes.length,
        },
        entry.type === 'symlink' ? undefined : bytes,
        (error) => (error ? reject(error) : resolvePromise()),
      );
    });
  }
  archive.finalize();
  await writing;
}

describe('BackupValidationService archive security', () => {
  let root: string;
  let service: BackupValidationService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'khayati-archive-security-'));
    service = new BackupValidationService();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('rejects a corrupt gzip archive without writing extracted files', async () => {
    const archivePath = join(root, 'corrupt.kmb');
    await writeFile(archivePath, 'not-a-tar-gzip');
    await expect(service.inspectBackupManifest(archivePath)).rejects.toMatchObject({
      code: 'ARCHIVE_INVALID',
    });
  });

  it('rejects path traversal before extraction', async () => {
    const archivePath = join(root, 'traversal.kmb');
    const escapedPath = join(root, 'evil.txt');
    await createArchive(archivePath, [
      { name: '../evil.txt', content: 'must-not-be-written' },
    ]);
    await expect(service.inspectBackupManifest(archivePath)).rejects.toMatchObject({
      code: 'ARCHIVE_INVALID',
    });
    await expect(access(escapedPath)).rejects.toBeDefined();
  });

  it('rejects Windows drive paths and symbolic links', async () => {
    const driveArchive = join(root, 'drive-path.kmb');
    await createArchive(driveArchive, [
      { name: 'C:/Windows/evil.txt', content: 'unsafe' },
    ]);
    await expect(service.inspectBackupManifest(driveArchive)).rejects.toMatchObject({
      code: 'ARCHIVE_INVALID',
    });

    const linkArchive = join(root, 'symlink.kmb');
    await createArchive(linkArchive, [
      { name: 'manifest.json', type: 'symlink', linkname: '../outside' },
    ]);
    await expect(service.inspectBackupManifest(linkArchive)).rejects.toMatchObject({
      code: 'ARCHIVE_INVALID',
    });
  });

  it('refuses a backup from a newer schema during preflight', async () => {
    const archivePath = join(root, 'newer.kmb');
    const manifest = {
      format: 'khayati-manager-backup',
      backupFormatVersion: 1,
      archiveFormat: 'tar+gzip',
      application: 'Khayati Manager',
      appVersion: 'future',
        schemaVersion: 4,
      sqliteUserVersion: 3,
      createdAt: new Date().toISOString(),
      settingsSource: 'SQLITE',
      encryption: { mode: 'NONE' },
      database: {
        path: 'database/khayati.sqlite',
        size: 0,
        sha256: '0'.repeat(64),
      },
      assets: [],
      files: [],
      warnings: [],
      statistics: {
        customers: 0,
        suppliers: 0,
        workers: 0,
        invoices: 0,
        finishedProducts: 0,
      },
    };
    await createArchive(archivePath, [
      { name: 'manifest.json', content: JSON.stringify(manifest) },
    ]);
    await expect(service.inspectBackupManifest(archivePath)).rejects.toMatchObject({
      code: 'SCHEMA_VERSION_MISMATCH',
    });
  });

  it('rejects a corrupt SQLite payload even when its archive checksum matches', async () => {
    const archivePath = join(root, 'corrupt-database.kmb');
    const databaseContent = 'this-is-not-a-sqlite-database';
    const databaseHash = createHash('sha256')
      .update(databaseContent)
      .digest('hex');
    const manifest = {
      format: 'khayati-manager-backup',
      backupFormatVersion: 1,
      archiveFormat: 'tar+gzip',
      application: 'Khayati Manager',
      appVersion: '1.0.0',
      schemaVersion: 1,
      sqliteUserVersion: 1,
      createdAt: new Date().toISOString(),
      settingsSource: 'SQLITE',
      encryption: { mode: 'NONE' },
      database: {
        path: 'database/khayati.sqlite',
        size: Buffer.byteLength(databaseContent),
        sha256: databaseHash,
      },
      assets: [],
      files: [
        {
          path: 'database/khayati.sqlite',
          kind: 'DATABASE',
          size: Buffer.byteLength(databaseContent),
          sha256: databaseHash,
        },
      ],
      warnings: [],
      statistics: {
        customers: 0,
        suppliers: 0,
        workers: 0,
        invoices: 0,
        finishedProducts: 0,
      },
    };
    await createArchive(archivePath, [
      { name: 'manifest.json', content: JSON.stringify(manifest) },
      { name: 'database/khayati.sqlite', content: databaseContent },
    ]);

    await expect(
      service.validateBackupArchive(archivePath, join(root, 'corrupt-db-output')),
    ).rejects.toMatchObject({ code: 'DATABASE_INVALID' });
  });
});
