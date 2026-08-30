import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { DataSource } from 'typeorm';
import {
  createDataSourceOptions,
  ensureDatabaseDirectory,
  resolveDatabasePath,
  TYPEORM_MIGRATIONS_TABLE,
} from './database-options';
import { prepareHistoricalSchemaForBaseline } from './legacy-schema-preparation';
import {
  CURRENT_SCHEMA_VERSION,
  INITIAL_BASELINE_MIGRATION,
} from './schema-version';

type DatabaseInspection = {
  exists: boolean;
  businessTableCount: number;
  baselineRecorded: boolean;
  userVersion: number;
};

function tableExists(database: Database.Database, table: string) {
  return Boolean(
    database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table),
  );
}

export function inspectDatabase(databasePath: string): DatabaseInspection {
  if (!existsSync(databasePath)) {
    return {
      exists: false,
      businessTableCount: 0,
      baselineRecorded: false,
      userVersion: 0,
    };
  }

  const database = new Database(databasePath, { readonly: true });
  try {
    const userVersion = Number(
      database.pragma('user_version', { simple: true }) ?? 0,
    );
    const businessTableCount = Number(
      (
        database
          .prepare(
            `SELECT COUNT(*) AS count
               FROM sqlite_master
              WHERE type = 'table'
                AND name NOT LIKE 'sqlite_%'
                AND name != ?`,
          )
          .get(TYPEORM_MIGRATIONS_TABLE) as { count: number }
      ).count,
    );
    const baselineRecorded = tableExists(database, TYPEORM_MIGRATIONS_TABLE)
      ? Boolean(
          database
            .prepare(
              `SELECT 1 FROM "${TYPEORM_MIGRATIONS_TABLE}" WHERE name = ?`,
            )
            .get(INITIAL_BASELINE_MIGRATION),
        )
      : false;

    return {
      exists: true,
      businessTableCount,
      baselineRecorded,
      userVersion,
    };
  } finally {
    database.close();
  }
}

function backupTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 17);
}

export async function createPreMigrationBackup(databasePath: string) {
  const backupDirectory = join(dirname(databasePath), 'pre-migration-backup');
  mkdirSync(backupDirectory, { recursive: true });
  const sourceName = basename(databasePath, '.sqlite');
  const backupPath = join(
    backupDirectory,
    `${sourceName}_before_migrations_${backupTimestamp()}.sqlite`,
  );
  const database = new Database(databasePath, { readonly: true });
  try {
    await database.backup(backupPath);
  } finally {
    database.close();
  }
  return backupPath;
}

function setUserVersion(databasePath: string, version: number) {
  const database = new Database(databasePath);
  try {
    database.pragma(`user_version = ${version}`);
  } finally {
    database.close();
  }
}

export async function prepareDatabaseForStartup(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const databasePath = resolveDatabasePath(environment);
  ensureDatabaseDirectory(databasePath);
  const before = inspectDatabase(databasePath);

  if (before.userVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Database schema version ${before.userVersion} is newer than the supported version ${CURRENT_SCHEMA_VERSION}.`,
    );
  }

  const requiresBaseline =
    before.businessTableCount > 0 && !before.baselineRecorded;
  let safetyBackupPath: string | null = null;

  if (requiresBaseline) {
    safetyBackupPath = await createPreMigrationBackup(databasePath);
    prepareHistoricalSchemaForBaseline(databasePath);
  }

  const dataSource = new DataSource(createDataSourceOptions(environment));
  try {
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });
  } catch (error) {
    throw new Error(
      `SQLite migration failed for ${databasePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }

  let after = inspectDatabase(databasePath);
  if (after.baselineRecorded && after.userVersion === 0) {
    setUserVersion(databasePath, CURRENT_SCHEMA_VERSION);
    after = inspectDatabase(databasePath);
  }

  if (!after.baselineRecorded) {
    throw new Error('The TypeORM initial schema baseline was not recorded.');
  }
  if (after.userVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Database schema version ${after.userVersion} does not match the supported version ${CURRENT_SCHEMA_VERSION}.`,
    );
  }

  return {
    databasePath,
    safetyBackupPath,
    schemaVersion: after.userVersion,
  };
}
