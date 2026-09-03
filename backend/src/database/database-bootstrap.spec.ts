import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataSource, MigrationInterface, QueryRunner } from 'typeorm';
import {
  inspectDatabase,
  prepareDatabaseForStartup,
} from './database-bootstrap';
import {
  createDataSourceOptions,
  TYPEORM_MIGRATIONS_TABLE,
} from './database-options';
import { InitialSchemaBaseline1788102000000 } from './migrations/1788102000000-InitialSchemaBaseline';
import { OptimizeStartupAndQueries1788462000000 } from './migrations/1788462000000-OptimizeStartupAndQueries';
import { FinalizeQueryIndexes1788465600000 } from './migrations/1788465600000-FinalizeQueryIndexes';

const EXPECTED_BUSINESS_TABLES = 40;

class MigrationProbe1788465600001 implements MigrationInterface {
  name = 'MigrationProbe1788465600001';

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(
      'CREATE TABLE "migration_probe" ("id" integer PRIMARY KEY NOT NULL)',
    );
    await queryRunner.query('PRAGMA user_version = 4');
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query('DROP TABLE "migration_probe"');
    await queryRunner.query('PRAGMA user_version = 3');
  }
}

function environment(databasePath: string): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    KHAYATI_PACKAGED: 'true',
    KHAYATI_DATABASE_PATH: databasePath,
    TYPEORM_SYNCHRONIZE: 'false',
  };
}

function businessTables(databasePath: string) {
  const database = new Database(databasePath, { readonly: true });
  try {
    return (
      database
        .prepare(
          `SELECT name FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
              AND name != ?
            ORDER BY name`,
        )
        .all(TYPEORM_MIGRATIONS_TABLE) as Array<{ name: string }>
    ).map((row) => row.name);
  } finally {
    database.close();
  }
}

function rowCounts(databasePath: string) {
  const database = new Database(databasePath, { readonly: true });
  try {
    return Object.fromEntries(
      businessTables(databasePath).map((table) => {
        const escapedTable = table.replace(/"/g, '""');
        const row = database
          .prepare(`SELECT COUNT(*) AS count FROM "${escapedTable}"`)
          .get() as { count: number };
        return [table, row.count];
      }),
    );
  } finally {
    database.close();
  }
}

async function createConsistentCopy(source: string, destination: string) {
  const database = new Database(source, { readonly: true });
  try {
    await database.backup(destination);
  } finally {
    database.close();
  }
}

function resetMigrationMarkers(databasePath: string) {
  const database = new Database(databasePath);
  try {
    database.exec(`DROP TABLE IF EXISTS "${TYPEORM_MIGRATIONS_TABLE}"`);
    database.pragma('user_version = 0');
  } finally {
    database.close();
  }
}

describe('database migration bootstrap', () => {
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'khayati-migrations-'));
  });

  afterEach(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('baselines an existing database without changing business rows', async () => {
    const source = join(__dirname, '..', '..', 'database', 'khayati.sqlite');
    expect(existsSync(source)).toBe(true);
    const target = join(temporaryDirectory, 'existing.sqlite');
    await createConsistentCopy(source, target);
    resetMigrationMarkers(target);

    const tablesBefore = businessTables(target);
    const rowsBefore = rowCounts(target);
    expect(tablesBefore).toHaveLength(EXPECTED_BUSINESS_TABLES);
    expect(inspectDatabase(target).userVersion).toBe(0);

    const firstRun = await prepareDatabaseForStartup(environment(target));
    const afterFirstRun = inspectDatabase(target);

    expect(firstRun.safetyBackupPath).not.toBeNull();
    expect(existsSync(firstRun.safetyBackupPath!)).toBe(true);
    expect(afterFirstRun.userVersion).toBe(3);
    expect(afterFirstRun.baselineRecorded).toBe(true);
    expect(businessTables(target)).toEqual(tablesBefore);
    expect(rowCounts(target)).toEqual(rowsBefore);

    const secondRun = await prepareDatabaseForStartup(environment(target));
    expect(secondRun.safetyBackupPath).toBeNull();
    expect(businessTables(target)).toEqual(tablesBefore);
    expect(rowCounts(target)).toEqual(rowsBefore);

    const database = new Database(target, { readonly: true });
    try {
      const row = database
        .prepare(
          `SELECT COUNT(*) AS count FROM "${TYPEORM_MIGRATIONS_TABLE}"
            WHERE name = 'InitialSchemaBaseline1788102000000'`,
        )
        .get() as { count: number };
      expect(row.count).toBe(1);
    } finally {
      database.close();
    }
  });

  it('creates the complete schema in a new empty database', async () => {
    const target = join(temporaryDirectory, 'new-installation.sqlite');

    const result = await prepareDatabaseForStartup(environment(target));
    const inspection = inspectDatabase(target);

    expect(result.safetyBackupPath).toBeNull();
    expect(inspection.userVersion).toBe(3);
    expect(inspection.baselineRecorded).toBe(true);
    expect(inspection.businessTableCount).toBe(EXPECTED_BUSINESS_TABLES);
  });

  it('runs and reverts a later non-destructive migration on a temporary DB', async () => {
    const target = join(temporaryDirectory, 'future-migration.sqlite');
    const testEnvironment = environment(target);
    await prepareDatabaseForStartup(testEnvironment);

    const dataSource = new DataSource({
      ...createDataSourceOptions(testEnvironment),
      migrations: [
        InitialSchemaBaseline1788102000000,
        OptimizeStartupAndQueries1788462000000,
        FinalizeQueryIndexes1788465600000,
        MigrationProbe1788465600001,
      ],
    });
    await dataSource.initialize();
    try {
      await dataSource.runMigrations({ transaction: 'all' });
      expect(await dataSource.query('PRAGMA user_version')).toEqual([
        { user_version: 4 },
      ]);
      expect(
        await dataSource.query(
          "SELECT name FROM sqlite_master WHERE name = 'migration_probe'",
        ),
      ).toHaveLength(1);

      await dataSource.undoLastMigration({ transaction: 'all' });
      expect(await dataSource.query('PRAGMA user_version')).toEqual([
        { user_version: 3 },
      ]);
      expect(
        await dataSource.query(
          "SELECT name FROM sqlite_master WHERE name = 'migration_probe'",
        ),
      ).toHaveLength(0);
    } finally {
      await dataSource.destroy();
    }
  });
});
