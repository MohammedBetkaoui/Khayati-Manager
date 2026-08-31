import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BackupCatalogService } from './backup-catalog.service';
import { BackupOperationLockService } from './backup-operation-lock.service';
import { BackupSchedulerService } from './backup-scheduler.service';
import type { BackupService } from './backup.service';

describe('BackupSchedulerService', () => {
  const originalDatabasePath = process.env.KHAYATI_DATABASE_PATH;
  let root: string;
  let databasePath: string;
  let inspectBackup: jest.Mock;
  let createBackup: jest.Mock;
  let backupService: Pick<BackupService, 'inspectBackup' | 'createBackup'>;
  let catalog: BackupCatalogService;
  let scheduler: BackupSchedulerService;
  const manifests = new Map<string, string>();

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'khayati-auto-scheduler-'));
    databasePath = join(root, 'database', 'khayati.sqlite');
    await mkdir(join(root, 'database'), { recursive: true });
    await writeFile(databasePath, 'fixture');
    process.env.KHAYATI_DATABASE_PATH = databasePath;
    manifests.clear();
    inspectBackup = jest.fn(async ({ filePath }: { filePath: string }) => {
      const createdAt = manifests.get(filePath);
      if (!createdAt) throw new Error('corrupt');
      return {
        archiveSize: 100,
        archiveSha256: 'test',
        manifest: { createdAt },
      };
    });
    createBackup = jest.fn(async ({ destinationPath, createdAt }) => {
      await writeFile(destinationPath, 'valid-auto-backup');
      manifests.set(destinationPath, createdAt.toISOString());
      return {
        filePath: destinationPath,
        fileName: destinationPath.split(/[\\/]/).pop(),
        size: 100,
        sha256: 'test',
        manifest: { createdAt: createdAt.toISOString(), warnings: [] },
      };
    });
    backupService = { inspectBackup, createBackup };
    catalog = new BackupCatalogService(
      backupService as BackupService,
      new BackupOperationLockService(),
    );
    scheduler = new BackupSchedulerService(
      backupService as BackupService,
      catalog,
    );
  });

  afterEach(async () => {
    process.env.KHAYATI_DATABASE_PATH = originalDatabasePath;
    await rm(root, { recursive: true, force: true });
  });

  it('creates one backup on the first run and skips subsequent runs that day', async () => {
    const now = new Date(2026, 7, 30, 9, 15);
    const first = await scheduler.runDailyAutomaticBackup({
      retention: 14,
      now,
    });
    const second = await scheduler.runDailyAutomaticBackup({
      retention: 14,
      now: new Date(2026, 7, 30, 18, 45),
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.skippedReason).toBe('ALREADY_CREATED_TODAY');
    expect(createBackup).toHaveBeenCalledTimes(1);
  });

  it('creates a new backup on the next local calendar day', async () => {
    await scheduler.runDailyAutomaticBackup({
      retention: 14,
      now: new Date(2026, 7, 30, 23, 50),
    });
    const nextDay = await scheduler.runDailyAutomaticBackup({
      retention: 14,
      now: new Date(2026, 7, 31, 8, 0),
    });

    expect(nextDay.created).toBe(true);
    expect(createBackup).toHaveBeenCalledTimes(2);
  });

  it('does not multiply backups when the system clock moves backwards', async () => {
    await scheduler.runDailyAutomaticBackup({
      retention: 14,
      now: new Date(2026, 7, 31, 10, 0),
    });
    const result = await scheduler.runDailyAutomaticBackup({
      retention: 14,
      now: new Date(2026, 7, 29, 10, 0),
    });

    expect(result.created).toBe(false);
    expect(result.skippedReason).toBe('SYSTEM_CLOCK_BEHIND');
    expect(createBackup).toHaveBeenCalledTimes(1);
  });

  it.each([7, 14, 30] as const)(
    'retains at most %s valid automatic backups and leaves corrupt and safety files untouched',
    async (retention) => {
      const autoDirectory = await catalog.ensureAutomaticDirectory();
      const safetyDirectory = catalog.safetyDirectory();
      await mkdir(safetyDirectory, { recursive: true });
      for (let index = 0; index < retention + 2; index += 1) {
        const filePath = join(
          autoDirectory,
          `KhayatiManager_AutoBackup_2026-08-${String(index + 1).padStart(2, '0')}_10-00.kmb`,
        );
        await writeFile(filePath, 'valid');
        manifests.set(
          filePath,
          new Date(2026, 7, index + 1, 10, 0).toISOString(),
        );
      }
      const corruptPath = join(
        autoDirectory,
        'KhayatiManager_AutoBackup_corrupt.kmb',
      );
      const safetyPath = join(
        safetyDirectory,
        'KhayatiManager_BeforeRestore_test.kmb',
      );
      await writeFile(corruptPath, 'corrupt');
      await writeFile(safetyPath, 'safety');

      const result = await catalog.applyAutomaticRetention(retention);

      expect(result.kept).toBe(retention);
      await expect(writeFile(corruptPath, 'still-here', { flag: 'r+' })).resolves.toBeUndefined();
      await expect(writeFile(safetyPath, 'still-here', { flag: 'r+' })).resolves.toBeUndefined();
    },
  );
});
