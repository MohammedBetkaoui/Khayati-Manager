import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { BackupError } from './backup.errors';
import { CRITICAL_RESTORE_TABLES } from './restore.constants';

export type RestoreDatabaseInspection = {
  userVersion: number;
  tableCounts: Record<string, number>;
};

@Injectable()
export class RestoreValidationService {
  validateDatabase(
    databasePath: string,
    expectedSchemaVersion: number,
    requireCriticalTables: boolean,
  ): RestoreDatabaseInspection {
    let database: Database.Database;
    try {
      database = new Database(databasePath, {
        readonly: true,
        fileMustExist: true,
      });
    } catch (error) {
      throw new BackupError(
        'DATABASE_INVALID',
        'The restored SQLite database cannot be opened.',
        { cause: error },
      );
    }

    try {
      const integrityRows = database.pragma('integrity_check') as Array<
        Record<string, unknown>
      >;
      if (
        integrityRows.length !== 1 ||
        String(Object.values(integrityRows[0])[0]).toLowerCase() !== 'ok'
      ) {
        throw new BackupError(
          'DATABASE_INVALID',
          'The restored SQLite database failed integrity_check.',
        );
      }

      const foreignKeyRows = database.pragma('foreign_key_check') as Array<
        Record<string, unknown>
      >;
      if (foreignKeyRows.length > 0) {
        throw new BackupError(
          'FOREIGN_KEY_VIOLATION',
          'The restored SQLite database contains foreign-key violations.',
        );
      }

      const userVersion = Number(
        database.pragma('user_version', { simple: true }) ?? 0,
      );
      if (userVersion !== expectedSchemaVersion) {
        throw new BackupError(
          'SCHEMA_VERSION_MISMATCH',
          `Restored schema version ${userVersion} does not match ${expectedSchemaVersion}.`,
        );
      }

      const tableCounts: Record<string, number> = {};
      if (requireCriticalTables) {
        for (const table of CRITICAL_RESTORE_TABLES) {
          if (!this.tableExists(database, table)) {
            throw new BackupError(
              'CRITICAL_TABLE_MISSING',
              `The restored database is missing critical table ${table}.`,
            );
          }
          tableCounts[table] = Number(
            (
              database
                .prepare(`SELECT COUNT(*) AS count FROM "${table}"`)
                .get() as { count: number }
            ).count,
          );
        }
      }

      return { userVersion, tableCounts };
    } catch (error) {
      if (error instanceof BackupError) throw error;
      throw new BackupError(
        'DATABASE_INVALID',
        'The restored SQLite database could not be validated.',
        { cause: error },
      );
    } finally {
      database.close();
    }
  }

  private tableExists(database: Database.Database, table: string) {
    return Boolean(
      database
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(table),
    );
  }
}
