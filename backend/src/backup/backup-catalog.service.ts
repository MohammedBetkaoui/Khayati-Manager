import { Injectable, Logger } from '@nestjs/common';
import Database from 'better-sqlite3';
import { lstat, mkdir, readdir, realpath, rm, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { resolveDatabasePath } from '../database/database-options';
import { BACKUP_EXTENSION } from './backup.constants';
import { BackupError } from './backup.errors';
import { BackupOperationLockService } from './backup-operation-lock.service';
import { BackupService } from './backup.service';

export type LocalBackupType = 'AUTOMATIC' | 'PRE_RESTORE';

export type LocalBackupEntry = {
  filePath: string;
  fileName: string;
  type: LocalBackupType;
  createdAt: string;
  size: number;
  status: 'VALID';
};

type CatalogCandidate = {
  filePath: string;
  type: LocalBackupType;
  modifiedAt: number;
  size: number;
};

@Injectable()
export class BackupCatalogService {
  private readonly logger = new Logger(BackupCatalogService.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly operationLock: BackupOperationLockService,
  ) {}

  automaticDirectory() {
    return join(this.userDataRoot(), 'Backups', 'Auto');
  }

  safetyDirectory() {
    return join(this.userDataRoot(), 'SafetyBackups');
  }

  async ensureAutomaticDirectory() {
    const directory = this.automaticDirectory();
    await mkdir(directory, { recursive: true });
    return directory;
  }

  async listLocalBackups(limit = 5): Promise<LocalBackupEntry[]> {
    const candidates = [
      ...(await this.readCandidates(this.automaticDirectory(), 'AUTOMATIC')),
      ...(await this.readCandidates(this.safetyDirectory(), 'PRE_RESTORE')),
    ].sort((left, right) => right.modifiedAt - left.modifiedAt);
    const result: LocalBackupEntry[] = [];

    for (const candidate of candidates) {
      if (result.length >= limit) break;
      const validated = await this.validateCandidate(candidate);
      if (validated) result.push(validated);
    }
    return result;
  }

  async listValidAutomaticBackups(): Promise<LocalBackupEntry[]> {
    const candidates = await this.readCandidates(
      this.automaticDirectory(),
      'AUTOMATIC',
    );
    const validated = await Promise.all(
      candidates.map((candidate) => this.validateCandidate(candidate)),
    );
    return validated
      .filter((entry): entry is LocalBackupEntry => Boolean(entry))
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      );
  }

  async applyAutomaticRetention(retention: 7 | 14 | 30) {
    const valid = await this.listValidAutomaticBackups();
    const expired = valid.slice(retention);
    for (const entry of expired) {
      await rm(entry.filePath, { force: true });
    }
    return {
      kept: valid.length - expired.length,
      deleted: expired.length,
    };
  }

  async automaticBackupForDay(date: Date) {
    const key = this.localDayKey(date);
    const valid = await this.listValidAutomaticBackups();
    return valid.find(
      (entry) => this.localDayKey(new Date(entry.createdAt)) === key,
    );
  }

  async latestAutomaticBackup() {
    return (await this.listValidAutomaticBackups())[0] ?? null;
  }

  async totalLocalBackupSize() {
    const candidates = [
      ...(await this.readCandidates(this.automaticDirectory(), 'AUTOMATIC')),
      ...(await this.readCandidates(this.safetyDirectory(), 'PRE_RESTORE')),
    ];
    return candidates.reduce((total, candidate) => total + candidate.size, 0);
  }

  hasImportantData() {
    const databasePath = resolve(resolveDatabasePath(process.env));
    let database: Database.Database | null = null;
    try {
      database = new Database(databasePath, {
        readonly: true,
        fileMustExist: true,
      });
      const counts = [
        this.tableCount(database, 'customers'),
        this.tableCount(database, 'suppliers'),
        this.tableCount(database, 'workers'),
        this.tableCount(database, 'invoices'),
        this.tableCount(database, 'finished_products'),
      ];
      const commercialRecords = counts[3] + counts[4];
      return commercialRecords > 0 || counts.reduce((sum, count) => sum + count, 0) >= 3;
    } catch (error) {
      this.logger.warn(
        `Unable to determine whether the database contains important data: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return false;
    } finally {
      database?.close();
    }
  }

  async deleteKnownLocalBackup(filePath: string) {
    if (this.operationLock.currentOperation()) {
      throw new BackupError(
        this.operationLock.isRestoreInProgress()
          ? 'RESTORE_IN_PROGRESS'
          : 'BACKUP_IN_PROGRESS',
        'A backup operation is currently in progress.',
      );
    }
    const safePath = await this.assertKnownLocalPath(filePath);
    await this.backupService.inspectBackup({ filePath: safePath });
    await rm(safePath, { force: false });
  }

  private async validateCandidate(candidate: CatalogCandidate) {
    try {
      const validated = await this.backupService.inspectBackup({
        filePath: candidate.filePath,
      });
      return {
        filePath: candidate.filePath,
        fileName: basename(candidate.filePath),
        type: candidate.type,
        createdAt: validated.manifest.createdAt,
        size: validated.archiveSize,
        status: 'VALID' as const,
      };
    } catch (error) {
      this.logger.warn(
        `Ignored invalid backup in ${candidate.type} catalog: ${basename(candidate.filePath)} (${error instanceof Error ? error.message : 'unknown error'})`,
      );
      return null;
    }
  }

  private async readCandidates(
    directory: string,
    type: LocalBackupType,
  ): Promise<CatalogCandidate[]> {
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const prefix =
      type === 'AUTOMATIC'
        ? 'KhayatiManager_AutoBackup_'
        : 'KhayatiManager_BeforeRestore_';
    const result: CatalogCandidate[] = [];
    for (const name of names) {
      if (!name.startsWith(prefix) || extname(name).toLowerCase() !== BACKUP_EXTENSION) {
        continue;
      }
      const filePath = join(directory, name);
      try {
        const metadata = await lstat(filePath);
        if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size <= 0) {
          continue;
        }
        result.push({
          filePath,
          type,
          modifiedAt: metadata.mtimeMs,
          size: metadata.size,
        });
      } catch {
        // A concurrently removed file is simply omitted from this snapshot.
      }
    }
    return result;
  }

  private async assertKnownLocalPath(filePath: string) {
    if (!filePath?.trim() || extname(filePath).toLowerCase() !== BACKUP_EXTENSION) {
      throw new BackupError('DESTINATION_INVALID', 'Invalid local backup path.');
    }
    const resolvedPath = resolve(filePath);
    const allowedDirectories = [this.automaticDirectory(), this.safetyDirectory()];
    const parent = dirname(resolvedPath);
    if (!allowedDirectories.some((directory) => resolve(directory) === parent)) {
      throw new BackupError(
        'DESTINATION_INVALID',
        'The backup is outside the managed local backup directories.',
      );
    }
    const metadata = await lstat(resolvedPath).catch(() => null);
    if (!metadata?.isFile() || metadata.isSymbolicLink()) {
      throw new BackupError('ARCHIVE_INVALID', 'The local backup was not found.');
    }
    const [realFile, realParent] = await Promise.all([
      realpath(resolvedPath),
      realpath(parent),
    ]);
    if (dirname(realFile) !== realParent) {
      throw new BackupError('DESTINATION_INVALID', 'Invalid local backup path.');
    }
    return realFile;
  }

  private userDataRoot() {
    return dirname(dirname(resolve(resolveDatabasePath(process.env))));
  }

  private tableCount(database: Database.Database, tableName: string) {
    const exists = database
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      )
      .get(tableName);
    if (!exists) return 0;
    return Number(
      (database.prepare(`SELECT COUNT(*) AS count FROM "${tableName}"`).get() as {
        count: number;
      }).count ?? 0,
    );
  }

  private localDayKey(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}
