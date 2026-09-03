import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import {
  access,
  mkdir,
  open,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BackupArchiveService } from './backup-archive.service';
import { BackupError } from './backup.errors';
import { fileMetadata } from './backup-file-utils';
import { BackupService } from './backup.service';
import { BackupManifest } from './backup.types';
import { BackupValidationService } from './backup-validation.service';
import { BackupWorkspaceService } from './backup-workspace.service';
import { BackupOperationLockService } from './backup-operation-lock.service';

class FailingArchiveService extends BackupArchiveService {
  override async packageBackup(): Promise<string> {
    throw new Error('Simulated archive failure');
  }
}

async function consistentDatabaseCopy(source: string, destination: string) {
  const database = new Database(source, { readonly: true });
  try {
    await database.backup(destination);
  } finally {
    database.close();
  }
}

function configureWorkshopAsset(
  databasePath: string,
  field: 'logoPath' | 'stampPath',
  value: string,
) {
  const database = new Database(databasePath);
  try {
    const existing = database
      .prepare('SELECT id FROM workshop_settings ORDER BY id ASC LIMIT 1')
      .get() as { id: number } | undefined;
    if (existing) {
      database
        .prepare(`UPDATE workshop_settings SET "${field}" = ? WHERE id = ?`)
        .run(value, existing.id);
      return;
    }
    database
      .prepare(
        `INSERT INTO workshop_settings
          (workshopName, "${field}", defaultCurrency, defaultTaxEnabled,
           defaultTaxRate, createdAt, updatedAt)
         VALUES ('', ?, 'DZD', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(value);
  } finally {
    database.close();
  }
}

describe('BackupService', () => {
  const activeDatabase = join(
    __dirname,
    '..',
    '..',
    'database',
    'khayati.sqlite',
  );
  let testDirectory: string;
  let workspaceRoot: string;
  let validationService: BackupValidationService;
  let backupService: BackupService;

  beforeEach(async () => {
    testDirectory = mkdtempSync(join(tmpdir(), 'khayati-backup-'));
    workspaceRoot = join(testDirectory, 'temp');
    await mkdir(workspaceRoot, { recursive: true });
    validationService = new BackupValidationService();
    backupService = new BackupService(
      new BackupArchiveService(),
      validationService,
      new BackupWorkspaceService(),
      new BackupOperationLockService(),
    );
  });

  afterEach(async () => {
    await rm(testDirectory, { recursive: true, force: true });
  });

  it('creates and validates a portable KMB from the active SQLite database', async () => {
    const destination = join(testDirectory, 'manual-backup.kmb');
    const result = await backupService.createBackup({
      destinationPath: destination,
      databasePath: activeDatabase,
      tempRootPath: workspaceRoot,
      appVersion: '1.0.0-test',
      createdAt: new Date('2026-08-30T15:30:00.000Z'),
    });

    expect((await stat(destination)).size).toBeGreaterThan(0);
    expect(result.filePath).toBe(destination);
    expect(result.manifest.format).toBe('khayati-manager-backup');
    expect(result.manifest.schemaVersion).toBe(3);
    expect(result.manifest.sqliteUserVersion).toBe(3);
    expect(result.manifest.database.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.manifest.files[0].path).toBe('database/khayati.sqlite');
    expect(await readdir(workspaceRoot)).toEqual([]);

    const validated = await validationService.validateBackupArchive(
      destination,
      join(testDirectory, 'independent-validation'),
    );
    expect(validated.archiveSha256).toBe(result.sha256);
    expect(validated.manifest.statistics.customers).toBeGreaterThanOrEqual(0);
  });

  it('includes a configured local workshop logo with its checksum', async () => {
    const databaseCopy = join(testDirectory, 'asset-source.sqlite');
    await consistentDatabaseCopy(activeDatabase, databaseCopy);
    const logoPath = join(testDirectory, 'custom-logo.png');
    await writeFile(
      logoPath,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]),
    );
    configureWorkshopAsset(databaseCopy, 'logoPath', logoPath);

    const destination = join(testDirectory, 'with-logo.kmb');
    const result = await backupService.createBackup({
      destinationPath: destination,
      databasePath: databaseCopy,
      tempRootPath: workspaceRoot,
    });

    expect(result.manifest.assets).toEqual([
      expect.objectContaining({
        kind: 'WORKSHOP_LOGO',
        databaseField: 'logoPath',
        path: 'assets/workshop-logo.png',
      }),
    ]);
    expect(
      result.manifest.files.find(
        (file) => file.path === 'assets/workshop-logo.png',
      )?.sha256,
    ).toMatch(/^[a-f0-9]{64}$/);
  });

  it('records a warning instead of failing for a missing configured asset', async () => {
    const databaseCopy = join(testDirectory, 'missing-asset.sqlite');
    await consistentDatabaseCopy(activeDatabase, databaseCopy);
    configureWorkshopAsset(
      databaseCopy,
      'stampPath',
      join(testDirectory, 'missing-stamp.png'),
    );

    const result = await backupService.createBackup({
      destinationPath: join(testDirectory, 'missing-asset.kmb'),
      databasePath: databaseCopy,
      tempRootPath: workspaceRoot,
    });

    expect(result.manifest.warnings).toContainEqual(
      expect.objectContaining({
        code: 'ASSET_MISSING',
        assetKind: 'WORKSHOP_STAMP',
      }),
    );
  });

  it('never overwrites an existing KMB file', async () => {
    const destination = join(testDirectory, 'existing.kmb');
    await writeFile(destination, 'existing-backup');

    await expect(
      backupService.createBackup({
        destinationPath: destination,
        databasePath: activeDatabase,
        tempRootPath: workspaceRoot,
      }),
    ).rejects.toMatchObject({ code: 'DESTINATION_EXISTS' });
    expect(await readFile(destination, 'utf8')).toBe('existing-backup');
  });

  it('detects a corrupted KMB archive', async () => {
    const destination = join(testDirectory, 'corruption-test.kmb');
    await backupService.createBackup({
      destinationPath: destination,
      databasePath: activeDatabase,
      tempRootPath: workspaceRoot,
    });
    const file = await open(destination, 'r+');
    try {
      const metadata = await file.stat();
      const position = Math.floor(metadata.size / 2);
      const original = Buffer.alloc(1);
      await file.read(original, 0, 1, position);
      original[0] ^= 0xff;
      await file.write(original, 0, 1, position);
    } finally {
      await file.close();
    }

    await expect(
      validationService.validateBackupArchive(
        destination,
        join(testDirectory, 'corrupt-validation'),
      ),
    ).rejects.toBeInstanceOf(BackupError);
  });

  it('rejects a structurally valid archive with an incorrect file checksum', async () => {
    const workspaceService = new BackupWorkspaceService();
    const workspace =
      await workspaceService.createBackupWorkspace(workspaceRoot);
    try {
      const snapshotPath = join(workspace.databaseDirectory, 'khayati.sqlite');
      await consistentDatabaseCopy(activeDatabase, snapshotPath);
      const snapshot = validationService.validateDatabaseSnapshot(snapshotPath);
      const metadata = await fileMetadata(snapshotPath);
      const incorrectChecksum = '0'.repeat(64);
      const manifest: BackupManifest = {
        format: 'khayati-manager-backup',
        backupFormatVersion: 1,
        archiveFormat: 'tar+gzip',
        application: 'Khayati Manager',
        appVersion: 'test',
        schemaVersion: 1,
        sqliteUserVersion: 1,
        createdAt: new Date('2026-08-30T15:30:00.000Z').toISOString(),
        settingsSource: 'SQLITE',
        encryption: { mode: 'NONE' },
        database: {
          path: 'database/khayati.sqlite',
          size: metadata.size,
          sha256: incorrectChecksum,
        },
        assets: [],
        files: [
          {
            path: 'database/khayati.sqlite',
            kind: 'DATABASE',
            size: metadata.size,
            sha256: incorrectChecksum,
          },
        ],
        warnings: [],
        statistics: snapshot.statistics,
      };
      await new BackupArchiveService().packageBackup(workspace, manifest);

      await expect(
        validationService.validateBackupArchive(
          workspace.archivePath,
          join(workspace.rootPath, 'invalid-checksum-validation'),
        ),
      ).rejects.toMatchObject({ code: 'CHECKSUM_MISMATCH' });
    } finally {
      await workspaceService.cleanupBackupWorkspace(workspace);
    }
  });

  it('cleans its unique workspace after a packaging error', async () => {
    const failingService = new BackupService(
      new FailingArchiveService(),
      validationService,
      new BackupWorkspaceService(),
      new BackupOperationLockService(),
    );

    await expect(
      failingService.createBackup({
        destinationPath: join(testDirectory, 'failed.kmb'),
        databasePath: activeDatabase,
        tempRootPath: workspaceRoot,
      }),
    ).rejects.toBeInstanceOf(BackupError);
    expect(await readdir(workspaceRoot)).toEqual([]);
    await expect(
      access(join(testDirectory, 'failed.kmb')),
    ).rejects.toBeDefined();
  });

  it('generates the required default backup filename', () => {
    expect(
      backupService.createSuggestedFileName(new Date(2026, 7, 30, 15, 5)),
    ).toBe('KhayatiManager_Backup_2026-08-30_15-05.kmb');
  });

  it('inspects an existing KMB without leaving extracted files behind', async () => {
    const destination = join(testDirectory, 'inspection-test.kmb');
    await backupService.createBackup({
      destinationPath: destination,
      databasePath: activeDatabase,
      tempRootPath: workspaceRoot,
    });

    const inspectionRoot = join(testDirectory, 'inspection-temp');
    const result = await backupService.inspectBackup({
      filePath: destination,
      tempRootPath: inspectionRoot,
    });

    expect(result.manifest.format).toBe('khayati-manager-backup');
    expect(result.archiveSize).toBeGreaterThan(0);
    expect(await readdir(inspectionRoot)).toEqual([]);
  });
});
