import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { extract } from 'tar-stream';
import { fileMetadata, sha256File } from './backup-file-utils';
import {
  BACKUP_APPLICATION,
  BACKUP_ARCHIVE_FORMAT,
  BACKUP_DATABASE_PATH,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_MANIFEST_PATH,
} from './backup.constants';
import { BackupError } from './backup.errors';
import {
  BackupManifest,
  BackupStatistics,
  SnapshotInspection,
  ValidatedBackup,
} from './backup.types';
import {
  CURRENT_SCHEMA_VERSION,
  INITIAL_BASELINE_MIGRATION,
} from '../database/schema-version';
import { TYPEORM_MIGRATIONS_TABLE } from '../database/database-options';

const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_BACKUP_CONTENT_BYTES = 100 * 1024 * 1024 * 1024;

@Injectable()
export class BackupValidationService {
  validateDatabaseSnapshot(
    databasePath: string,
    expectedSchemaVersion = CURRENT_SCHEMA_VERSION,
  ): SnapshotInspection {
    let database: Database.Database;
    try {
      database = new Database(databasePath, {
        readonly: true,
        fileMustExist: true,
      });
    } catch (error) {
      throw new BackupError(
        'DATABASE_INVALID',
        'The SQLite backup snapshot cannot be opened.',
        { cause: error },
      );
    }

    try {
      const quickCheck = database.pragma('quick_check') as Array<
        Record<string, string>
      >;
      if (
        quickCheck.length !== 1 ||
        String(Object.values(quickCheck[0])[0]).toLowerCase() !== 'ok'
      ) {
        throw new BackupError(
          'DATABASE_INVALID',
          'The SQLite backup snapshot failed its integrity check.',
        );
      }

      const sqliteUserVersion = Number(
        database.pragma('user_version', { simple: true }) ?? 0,
      );
      if (sqliteUserVersion !== expectedSchemaVersion) {
        throw new BackupError(
          'SCHEMA_VERSION_MISMATCH',
          `SQLite schema version ${sqliteUserVersion} does not match expected version ${expectedSchemaVersion}.`,
        );
      }

      if (
        !this.tableExists(database, TYPEORM_MIGRATIONS_TABLE) ||
        !database
          .prepare(`SELECT 1 FROM "${TYPEORM_MIGRATIONS_TABLE}" WHERE name = ?`)
          .get(INITIAL_BASELINE_MIGRATION)
      ) {
        throw new BackupError(
          'DATABASE_INVALID',
          'The SQLite backup snapshot has no migration baseline.',
        );
      }

      return {
        sqliteUserVersion,
        statistics: this.readStatistics(database),
        configuredAssets: this.readConfiguredAssets(database),
      };
    } catch (error) {
      if (error instanceof BackupError) throw error;
      throw new BackupError(
        'DATABASE_INVALID',
        'The SQLite backup snapshot could not be validated.',
        { cause: error },
      );
    } finally {
      database.close();
    }
  }

  async validateBackupArchive(
    archivePath: string,
    extractionDirectory: string,
  ): Promise<ValidatedBackup> {
    const manifest = await this.inspectBackupManifest(archivePath);
    await mkdir(extractionDirectory, { recursive: false });
    const extractedFiles = await this.extractArchive(
      archivePath,
      extractionDirectory,
      manifest,
    );
    const manifestPath = join(extractionDirectory, BACKUP_MANIFEST_PATH);
    if (!extractedFiles.has(BACKUP_MANIFEST_PATH)) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup manifest is missing.',
      );
    }

    const manifestMetadata = await stat(manifestPath);
    if (
      manifestMetadata.size <= 0 ||
      manifestMetadata.size > MAX_MANIFEST_BYTES
    ) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup manifest size is invalid.',
      );
    }

    const extractedManifest = await this.parseManifestFile(manifestPath);
    if (JSON.stringify(extractedManifest) !== JSON.stringify(manifest)) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup manifest changed during extraction.',
      );
    }

    const expectedPaths = new Set([
      BACKUP_MANIFEST_PATH,
      ...manifest.files.map((file) => file.path),
    ]);
    if (
      expectedPaths.size !== manifest.files.length + 1 ||
      extractedFiles.size !== expectedPaths.size ||
      [...extractedFiles].some((path) => !expectedPaths.has(path))
    ) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup archive contains missing, duplicate, or unexpected files.',
      );
    }

    for (const file of manifest.files) {
      const extractedPath = this.safeExtractionPath(
        extractionDirectory,
        file.path,
      );
      const actual = await fileMetadata(extractedPath);
      if (actual.size !== file.size || actual.sha256 !== file.sha256) {
        throw new BackupError(
          'CHECKSUM_MISMATCH',
          `Backup checksum validation failed for ${file.path}.`,
        );
      }
    }

    const databaseFile = manifest.files.find(
      (file) => file.path === BACKUP_DATABASE_PATH && file.kind === 'DATABASE',
    );
    if (
      !databaseFile ||
      databaseFile.size !== manifest.database.size ||
      databaseFile.sha256 !== manifest.database.sha256
    ) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup database metadata is inconsistent.',
      );
    }

    this.validateDatabaseSnapshot(
      this.safeExtractionPath(extractionDirectory, BACKUP_DATABASE_PATH),
      manifest.schemaVersion,
    );

    const archiveMetadata = await stat(archivePath);
    return {
      manifest,
      archiveSize: archiveMetadata.size,
      archiveSha256: await sha256File(archivePath),
    };
  }

  async inspectBackupManifest(archivePath: string): Promise<BackupManifest> {
    const archiveMetadata = await stat(archivePath).catch((error) => {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The selected backup file could not be read.',
        { cause: error },
      );
    });
    if (!archiveMetadata.isFile() || archiveMetadata.size <= 0) {
      throw new BackupError('ARCHIVE_INVALID', 'The backup archive is empty.');
    }

    const archiveExtractor = extract();
    const seen = new Set<string>();
    const declaredSizes = new Map<string, number>();
    const manifestBuffer: { value: Buffer | null } = { value: null };
    let totalDeclaredBytes = 0;

    archiveExtractor.on('entry', (header, stream, next) => {
      const handleEntry = async () => {
        this.assertRegularArchiveEntry(header.type);
        const normalizedPath = this.normalizeArchivePath(header.name);
        if (seen.has(normalizedPath)) {
          throw new BackupError(
            'ARCHIVE_INVALID',
            'The backup contains duplicate archive entries.',
          );
        }
        seen.add(normalizedPath);
        const entrySize = header.size ?? -1;
        this.assertEntrySize(entrySize);
        totalDeclaredBytes += entrySize;
        if (totalDeclaredBytes > MAX_BACKUP_CONTENT_BYTES) {
          throw new BackupError(
            'ARCHIVE_INVALID',
            'The backup archive is larger than the supported limit.',
          );
        }
        declaredSizes.set(normalizedPath, entrySize);

        if (normalizedPath !== BACKUP_MANIFEST_PATH) {
          await pipeline(
            stream,
            new Writable({
              write(_chunk, _encoding, done) {
                done();
              },
            }),
          );
          return;
        }
        if (entrySize <= 0 || entrySize > MAX_MANIFEST_BYTES) {
          throw new BackupError(
            'ARCHIVE_INVALID',
            'The backup manifest size is invalid.',
          );
        }
        const chunks: Buffer[] = [];
        await pipeline(
          stream,
          new Writable({
            write(chunk: Buffer, _encoding, done) {
              chunks.push(Buffer.from(chunk));
              done();
            },
          }),
        );
        manifestBuffer.value = Buffer.concat(chunks);
      };

      void handleEntry()
        .then(() => next())
        .catch((error: unknown) => {
          archiveExtractor.destroy(
            error instanceof Error ? error : new Error(String(error)),
          );
        });
    });

    try {
      await pipeline(
        createReadStream(archivePath),
        createGunzip(),
        archiveExtractor,
      );
    } catch (error) {
      if (error instanceof BackupError) throw error;
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup archive is invalid or damaged.',
        { cause: error },
      );
    }

    if (!manifestBuffer.value) {
      throw new BackupError('ARCHIVE_INVALID', 'The backup manifest is missing.');
    }
    const manifest = this.parseManifestJson(
      manifestBuffer.value.toString('utf8'),
    );
    const expectedPaths = new Set([
      BACKUP_MANIFEST_PATH,
      ...manifest.files.map((file) => file.path),
    ]);
    if (
      seen.size !== expectedPaths.size ||
      [...seen].some((path) => !expectedPaths.has(path)) ||
      manifest.files.some((file) => declaredSizes.get(file.path) !== file.size)
    ) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup archive contains missing, unexpected, or incorrectly sized files.',
      );
    }
    return manifest;
  }

  private async extractArchive(
    archivePath: string,
    outputDirectory: string,
    manifest: BackupManifest,
  ) {
    const archiveExtractor = extract();
    const extractedFiles = new Set<string>();
    const expectedFiles = new Map(
      manifest.files.map((file) => [file.path, file] as const),
    );
    let extractedBytes = 0;

    archiveExtractor.on('entry', (header, stream, next) => {
      const handleEntry = async () => {
        this.assertRegularArchiveEntry(header.type);
        const normalizedPath = this.normalizeArchivePath(header.name);
        if (extractedFiles.has(normalizedPath)) {
          throw new BackupError(
            'ARCHIVE_INVALID',
            'The backup contains duplicate archive entries.',
          );
        }
        const entrySize = header.size ?? -1;
        this.assertEntrySize(entrySize);
        const expected = expectedFiles.get(normalizedPath);
        if (normalizedPath === BACKUP_MANIFEST_PATH) {
          if (entrySize <= 0 || entrySize > MAX_MANIFEST_BYTES) {
            throw new BackupError(
              'ARCHIVE_INVALID',
              'The backup manifest size is invalid.',
            );
          }
        } else if (!expected || expected.size !== entrySize) {
          throw new BackupError(
            'ARCHIVE_INVALID',
            'The backup contains an unexpected file or size.',
          );
        }
        extractedBytes += entrySize;
        if (extractedBytes > MAX_BACKUP_CONTENT_BYTES) {
          throw new BackupError(
            'ARCHIVE_INVALID',
            'The backup archive is larger than the supported limit.',
          );
        }
        extractedFiles.add(normalizedPath);
        const destination = this.safeExtractionPath(
          outputDirectory,
          normalizedPath,
        );
        await mkdir(dirname(destination), { recursive: true });
        await pipeline(stream, createWriteStream(destination, { flags: 'wx' }));
      };

      void handleEntry()
        .then(() => next())
        .catch((error: unknown) => {
          archiveExtractor.destroy(
            error instanceof Error ? error : new Error(String(error)),
          );
        });
    });

    try {
      await pipeline(
        createReadStream(archivePath),
        createGunzip(),
        archiveExtractor,
      );
    } catch (error) {
      if (error instanceof BackupError) throw error;
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup archive is invalid or damaged.',
        { cause: error },
      );
    }
    return extractedFiles;
  }

  private async parseManifestFile(manifestPath: string) {
    try {
      return this.parseManifestJson(await readFile(manifestPath, 'utf8'));
    } catch (error) {
      if (error instanceof BackupError) throw error;
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup manifest could not be read.',
        { cause: error },
      );
    }
  }

  private parseManifestJson(value: string) {
    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(value) as BackupManifest;
    } catch (error) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup manifest is not valid JSON.',
        { cause: error },
      );
    }
    this.validateManifest(manifest);
    return manifest;
  }

  private validateManifest(manifest: BackupManifest) {
    if (
      Number.isInteger(manifest?.schemaVersion) &&
      manifest.schemaVersion > CURRENT_SCHEMA_VERSION
    ) {
      throw new BackupError(
        'SCHEMA_VERSION_MISMATCH',
        'The backup was created with a newer database schema.',
      );
    }

    if (
      manifest?.format !== BACKUP_FORMAT ||
      manifest.backupFormatVersion !== BACKUP_FORMAT_VERSION ||
      manifest.archiveFormat !== BACKUP_ARCHIVE_FORMAT ||
      manifest.application !== BACKUP_APPLICATION ||
      manifest.encryption?.mode !== 'NONE' ||
      typeof manifest.appVersion !== 'string' ||
      !manifest.appVersion ||
      Number.isNaN(Date.parse(manifest.createdAt)) ||
      !Number.isInteger(manifest.schemaVersion) ||
      manifest.schemaVersion <= 0 ||
      manifest.sqliteUserVersion !== manifest.schemaVersion ||
      manifest.database?.path !== BACKUP_DATABASE_PATH ||
      !Array.isArray(manifest.files) ||
      !Array.isArray(manifest.assets) ||
      !Array.isArray(manifest.warnings)
    ) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup manifest is incompatible or incomplete.',
      );
    }

    for (const file of manifest.files) {
      this.normalizeArchivePath(file.path);
      if (
        !Number.isSafeInteger(file.size) ||
        file.size < 0 ||
        !/^[a-f0-9]{64}$/.test(file.sha256) ||
        !['DATABASE', 'ASSET'].includes(file.kind)
      ) {
        throw new BackupError(
          'ARCHIVE_INVALID',
          'The backup file metadata is invalid.',
        );
      }
    }

    const filePaths = manifest.files.map((file) => file.path);
    const totalBytes = manifest.files.reduce((total, file) => total + file.size, 0);
    if (
      new Set(filePaths).size !== filePaths.length ||
      !Number.isSafeInteger(totalBytes) ||
      totalBytes > MAX_BACKUP_CONTENT_BYTES ||
      manifest.files.filter(
        (file) => file.path === BACKUP_DATABASE_PATH && file.kind === 'DATABASE',
      ).length !== 1
    ) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup file list is invalid.',
      );
    }

    for (const asset of manifest.assets) {
      if (
        !['WORKSHOP_LOGO', 'WORKSHOP_STAMP'].includes(asset.kind) ||
        !['logoPath', 'stampPath'].includes(asset.databaseField) ||
        !manifest.files.some(
          (file) => file.kind === 'ASSET' && file.path === asset.path,
        )
      ) {
        throw new BackupError(
          'ARCHIVE_INVALID',
          'The backup asset metadata is invalid.',
        );
      }
    }
  }

  private normalizeArchivePath(value: string) {
    if (
      typeof value !== 'string' ||
      !value ||
      value.includes('\0') ||
      value.includes('\\') ||
      value.startsWith('/') ||
      value.startsWith('//') ||
      /^[a-z]:/i.test(value) ||
      value.includes(':') ||
      value.split('/').some((part) => !part || part === '.' || part === '..')
    ) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup contains an unsafe archive path.',
      );
    }
    return value;
  }

  private safeExtractionPath(root: string, archivePath: string) {
    const normalizedPath = this.normalizeArchivePath(archivePath);
    const rootPath = resolve(root);
    const filePath = resolve(rootPath, ...normalizedPath.split('/'));
    if (
      !filePath
        .toLocaleLowerCase('en-US')
        .startsWith(`${rootPath}${sep}`.toLocaleLowerCase('en-US'))
    ) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup contains an unsafe extraction path.',
      );
    }
    return filePath;
  }

  private assertRegularArchiveEntry(type: string | null | undefined) {
    if (type && type !== 'file') {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup contains an unsupported archive entry.',
      );
    }
  }

  private assertEntrySize(size: number) {
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new BackupError(
        'ARCHIVE_INVALID',
        'The backup contains an invalid archive entry size.',
      );
    }
  }

  private tableExists(database: Database.Database, table: string) {
    return Boolean(
      database
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        )
        .get(table),
    );
  }

  private countRows(database: Database.Database, table: string) {
    if (!this.tableExists(database, table)) return 0;
    return Number(
      (
        database.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as {
          count: number;
        }
      ).count,
    );
  }

  private readStatistics(database: Database.Database): BackupStatistics {
    return {
      customers: this.countRows(database, 'customers'),
      suppliers: this.countRows(database, 'suppliers'),
      workers: this.countRows(database, 'workers'),
      invoices: this.countRows(database, 'invoices'),
      finishedProducts: this.countRows(database, 'finished_products'),
    };
  }

  private readConfiguredAssets(database: Database.Database) {
    if (!this.tableExists(database, 'workshop_settings')) {
      return { logoPath: null, stampPath: null };
    }
    const settings = database
      .prepare(
        'SELECT logoPath, stampPath FROM workshop_settings ORDER BY id ASC LIMIT 1',
      )
      .get() as
      { logoPath: string | null; stampPath: string | null } | undefined;
    return {
      logoPath: settings?.logoPath?.trim() || null,
      stampPath: settings?.stampPath?.trim() || null,
    };
  }
}
