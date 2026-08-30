import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { DataSourceOptions } from 'typeorm';

export const TYPEORM_MIGRATIONS_TABLE = 'typeorm_migrations';

function portableGlob(...parts: string[]) {
  return join(...parts).replace(/\\/g, '/');
}

export function resolveDatabasePath(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const configuredPath = environment.KHAYATI_DATABASE_PATH;
  if (configuredPath) {
    return isAbsolute(configuredPath)
      ? configuredPath
      : resolve(process.cwd(), configuredPath);
  }

  return join(__dirname, '..', '..', 'database', 'khayati.sqlite');
}

export function ensureDatabaseDirectory(databasePath: string) {
  const databaseDirectory = dirname(databasePath);
  if (!existsSync(databaseDirectory)) {
    mkdirSync(databaseDirectory, { recursive: true });
  }
  return databaseDirectory;
}

export function isPackagedRuntime(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return environment.KHAYATI_PACKAGED === 'true';
}

export function isProductionRuntime(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return (
    environment.NODE_ENV === 'production' || isPackagedRuntime(environment)
  );
}

export function shouldSynchronizeSchema(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return (
    !isProductionRuntime(environment) &&
    environment.TYPEORM_SYNCHRONIZE === 'true'
  );
}

function commonOptions(
  environment: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  const database = resolveDatabasePath(environment);
  ensureDatabaseDirectory(database);

  return {
    type: 'better-sqlite3',
    database,
    migrations: [portableGlob(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: TYPEORM_MIGRATIONS_TABLE,
    migrationsTransactionMode: 'all',
    migrationsRun: false,
  };
}

export function createDataSourceOptions(
  environment: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  return {
    ...commonOptions(environment),
    entities: [portableGlob(__dirname, '..', '**', '*.entity.{ts,js}')],
    synchronize: false,
  };
}

export function createNestTypeOrmOptions(
  environment: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions {
  return {
    ...commonOptions(environment),
    autoLoadEntities: true,
    synchronize: shouldSynchronizeSchema(environment),
  } as TypeOrmModuleOptions;
}
