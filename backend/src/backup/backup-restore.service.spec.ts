import Database from 'better-sqlite3';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../database/database-options';
import { BackupArchiveService } from './backup-archive.service';
import { BackupOperationLockService } from './backup-operation-lock.service';
import { BackupRestoreService } from './backup-restore.service';
import { BackupService } from './backup.service';
import { BackupValidationService } from './backup-validation.service';
import { BackupWorkspaceService } from './backup-workspace.service';
import { RestoreAssetsService } from './restore-assets.service';
import { RestoreMigrationService } from './restore-migration.service';
import { RestoreProgressService } from './restore-progress.service';
import { RestoreSwapService } from './restore-swap.service';
import { RestoreValidationService } from './restore-validation.service';
import { RestoreWorkspaceService } from './restore-workspace.service';

async function copyDatabase(source: string, destination: string) {
  await mkdir(dirname(destination), { recursive: true });
  const database = new Database(source, { readonly: true });
  try {
    await database.backup(destination);
  } finally {
    database.close();
  }
}

function updateWorkshopSettings(
  databasePath: string,
  workshopName: string,
  logoPath: string,
  stampPath: string,
) {
  const database = new Database(databasePath);
  try {
    const row = database
      .prepare('SELECT id FROM workshop_settings ORDER BY id LIMIT 1')
      .get() as { id: number } | undefined;
    if (row) {
      database
        .prepare(
          'UPDATE workshop_settings SET workshopName = ?, logoPath = ?, stampPath = ? WHERE id = ?',
        )
        .run(workshopName, logoPath, stampPath, row.id);
    } else {
      database
        .prepare(
          `INSERT INTO workshop_settings
            (workshopName, logoPath, stampPath, defaultCurrency, defaultTaxEnabled,
             defaultTaxRate, createdAt, updatedAt)
           VALUES (?, ?, ?, 'DZD', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        )
        .run(workshopName, logoPath, stampPath);
    }
  } finally {
    database.close();
  }
}

function financialFingerprint(databasePath: string) {
  const database = new Database(databasePath, { readonly: true });
  const definitions = [
    ['invoices', 'totalAmount'],
    ['payments', 'amount'],
    ['legacy_debts', 'remainingAmount'],
    ['customer_credit_transactions', 'amount'],
    ['payrolls', 'amountDue'],
    ['salary_payments', 'amount'],
    ['supplier_purchases', 'remainingAmount'],
    ['supplier_payments', 'amount'],
  ] as const;
  try {
    return Object.fromEntries(
      definitions.map(([table, column]) => {
        const value = database
          .prepare(
            `SELECT COUNT(*) AS count, COALESCE(SUM("${column}"), 0) AS total FROM "${table}"`,
          )
          .get() as { count: number; total: number };
        return [table, value];
      }),
    );
  } finally {
    database.close();
  }
}

describe('BackupRestoreService end-to-end', () => {
  const sourceDatabase = resolve(
    __dirname,
    '..',
    '..',
    'database',
    'khayati.sqlite',
  );
  let root: string;
  let previousDatabasePath: string | undefined;
  let dataSource: DataSource | undefined;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'khayati-restore-e2e-'));
    previousDatabasePath = process.env.KHAYATI_DATABASE_PATH;
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (previousDatabasePath === undefined) {
      delete process.env.KHAYATI_DATABASE_PATH;
    } else {
      process.env.KHAYATI_DATABASE_PATH = previousDatabasePath;
    }
    await rm(root, { recursive: true, force: true });
  });

  it('restores a validated copy, preserves financial data, keeps safety backup and relocates assets', async () => {
    const userData = join(root, 'NewComputerUserData');
    const activeDatabase = join(userData, 'database', 'khayati.sqlite');
    const oldComputerLogo = join(root, 'OldComputer', 'custom-logo.png');
    const oldComputerStamp = join(root, 'OldComputer', 'custom-stamp.png');
    const archivePath = join(root, 'atelier-backup.kmb');
    await mkdir(dirname(oldComputerLogo), { recursive: true });
    await writeFile(oldComputerLogo, 'portable-logo-content');
    await writeFile(oldComputerStamp, 'portable-stamp-content');
    await copyDatabase(sourceDatabase, activeDatabase);
    updateWorkshopSettings(
      activeDatabase,
      'STATE_FROM_BACKUP',
      oldComputerLogo,
      oldComputerStamp,
    );
    const expectedFinancialData = financialFingerprint(activeDatabase);

    const operationLock = new BackupOperationLockService();
    const validation = new BackupValidationService();
    const backupService = new BackupService(
      new BackupArchiveService(),
      validation,
      new BackupWorkspaceService(),
      operationLock,
    );
    await backupService.createBackup({
      destinationPath: archivePath,
      databasePath: activeDatabase,
      tempRootPath: join(userData, 'temp'),
      appVersion: 'restore-test',
    });

    updateWorkshopSettings(
      activeDatabase,
      'STATE_AFTER_BACKUP',
      oldComputerLogo,
      oldComputerStamp,
    );
    process.env.KHAYATI_DATABASE_PATH = activeDatabase;
    dataSource = new DataSource(createDataSourceOptions(process.env));
    await dataSource.initialize();

    const restoreService = new BackupRestoreService(
      dataSource,
      backupService,
      validation,
      new RestoreValidationService(),
      new RestoreMigrationService(),
      new RestoreAssetsService(),
      new RestoreSwapService(),
      new RestoreWorkspaceService(),
      operationLock,
      new RestoreProgressService(),
    );
    const result = await restoreService.restoreBackup({
      filePath: archivePath,
      appVersion: 'restore-test',
    });

    expect(result.schemaVersion).toBe(3);
    expect(dataSource.isInitialized).toBe(false);
    const restored = new Database(activeDatabase, { readonly: true });
    let restoredSettings:
      | {
          workshopName: string;
          logoPath: string | null;
          stampPath: string | null;
        }
      | undefined;
    try {
      restoredSettings = restored
        .prepare(
          'SELECT workshopName, logoPath, stampPath FROM workshop_settings ORDER BY id LIMIT 1',
        )
        .get() as
        | {
            workshopName: string;
            logoPath: string | null;
            stampPath: string | null;
          }
        | undefined;
    } finally {
      restored.close();
    }
    expect(restoredSettings?.workshopName).toBe('STATE_FROM_BACKUP');
    expect(restoredSettings?.logoPath).toContain(
      join('NewComputerUserData', 'assets', 'workshop'),
    );
    expect(restoredSettings?.logoPath).not.toBe(oldComputerLogo);
    expect(await readFile(restoredSettings!.logoPath!, 'utf8')).toBe(
      'portable-logo-content',
    );
    expect(restoredSettings?.stampPath).toContain(
      join('NewComputerUserData', 'assets', 'workshop'),
    );
    expect(await readFile(restoredSettings!.stampPath!, 'utf8')).toBe(
      'portable-stamp-content',
    );
    expect(financialFingerprint(activeDatabase)).toEqual(expectedFinancialData);

    const safetyDirectory = join(userData, 'SafetyBackups');
    const safetyFiles = await readdir(safetyDirectory);
    expect(safetyFiles).toContain(result.safetyBackupFileName);
    expect((await stat(join(safetyDirectory, result.safetyBackupFileName))).size).toBeGreaterThan(0);
    expect(await readdir(join(userData, 'temp'))).toEqual([]);
  }, 60_000);

  it('keeps the active database and TypeORM connection intact when preflight fails', async () => {
    const userData = join(root, 'ProtectedUserData');
    const activeDatabase = join(userData, 'database', 'khayati.sqlite');
    const corruptArchive = join(root, 'corrupt.kmb');
    await copyDatabase(sourceDatabase, activeDatabase);
    await writeFile(corruptArchive, 'damaged archive');
    const before = financialFingerprint(activeDatabase);
    process.env.KHAYATI_DATABASE_PATH = activeDatabase;
    dataSource = new DataSource(createDataSourceOptions(process.env));
    await dataSource.initialize();

    const operationLock = new BackupOperationLockService();
    const validation = new BackupValidationService();
    const backupService = new BackupService(
      new BackupArchiveService(),
      validation,
      new BackupWorkspaceService(),
      operationLock,
    );
    const restoreService = new BackupRestoreService(
      dataSource,
      backupService,
      validation,
      new RestoreValidationService(),
      new RestoreMigrationService(),
      new RestoreAssetsService(),
      new RestoreSwapService(),
      new RestoreWorkspaceService(),
      operationLock,
      new RestoreProgressService(),
    );

    await expect(
      restoreService.restoreBackup({ filePath: corruptArchive }),
    ).rejects.toMatchObject({ code: 'ARCHIVE_INVALID' });
    expect(dataSource.isInitialized).toBe(true);
    expect(financialFingerprint(activeDatabase)).toEqual(before);
  });
});
