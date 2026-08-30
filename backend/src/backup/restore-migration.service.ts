import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../database/database-options';
import { CURRENT_SCHEMA_VERSION } from '../database/schema-version';
import { BackupError } from './backup.errors';

@Injectable()
export class RestoreMigrationService {
  async migrateTemporaryDatabase(databasePath: string, schemaVersion: number) {
    if (schemaVersion > CURRENT_SCHEMA_VERSION) {
      throw new BackupError(
        'SCHEMA_VERSION_MISMATCH',
        'The backup was created with a newer database schema.',
      );
    }
    if (schemaVersion === CURRENT_SCHEMA_VERSION) return false;

    const environment = {
      ...process.env,
      KHAYATI_DATABASE_PATH: databasePath,
      TYPEORM_SYNCHRONIZE: 'false',
    };
    const dataSource = new DataSource(createDataSourceOptions(environment));
    try {
      await dataSource.initialize();
      await dataSource.runMigrations({ transaction: 'all' });
    } catch (error) {
      throw new BackupError(
        'RESTORE_FAILED',
        'Migrations failed on the temporary restored database.',
        { cause: error },
      );
    } finally {
      if (dataSource.isInitialized) await dataSource.destroy();
    }

    const database = new Database(databasePath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      const migratedVersion = Number(
        database.pragma('user_version', { simple: true }) ?? 0,
      );
      if (migratedVersion !== CURRENT_SCHEMA_VERSION) {
        throw new BackupError(
          'SCHEMA_VERSION_MISMATCH',
          'The temporary database did not reach the current schema version.',
        );
      }
    } finally {
      database.close();
    }
    return true;
  }
}
