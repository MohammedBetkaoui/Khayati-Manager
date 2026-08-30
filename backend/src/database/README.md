# Khayati SQLite schema management

## Sources of truth

- TypeORM's `typeorm_migrations` table is the detailed migration ledger.
- `CURRENT_SCHEMA_VERSION` in `schema-version.ts` is the single application
  schema version.
- SQLite `PRAGMA user_version` mirrors that version for fast inspection and
  future backup compatibility checks.

The application version and schema version are intentionally independent.

## Initial baseline strategy

`InitialSchemaBaseline1788102000000` supports both installation types:

1. On a new empty database, it creates the complete schema represented by the
   current TypeORM entities, then sets `PRAGMA user_version = 1`.
2. On a historical database, it verifies that all 40 expected business tables
   are present. It does not create, rebuild, drop, or alter any business table.
   It only sets `user_version = 1`; TypeORM then records the migration normally
   in `typeorm_migrations`.
3. A partially initialized historical database is rejected with a list of
   missing tables. Startup stops instead of attempting a destructive repair.

The baseline is therefore executed normally rather than marked with a CLI
`--fake` flag. Its own `up()` method safely distinguishes an empty installation
from an existing installation. Its `down()` deliberately throws so the initial
historical schema can never be dropped by `migration:revert`.

## Startup order

`main.ts` performs the following work before importing `AppModule`:

1. Resolve `KHAYATI_DATABASE_PATH` and create its parent directory.
2. Inspect `PRAGMA user_version` and the TypeORM migration ledger.
3. For an unversioned historical database, create a consistent SQLite backup
   with `better-sqlite3` under `database/pre-migration-backup`.
4. Run the non-destructive historical compatibility bridge once.
5. Run pending TypeORM migrations with transaction mode `all`.
6. Verify the baseline row and exact supported `user_version`.
7. Only then import NestJS modules and open application repositories.

Any migration or validation failure aborts backend startup.

## Synchronize policy

- Packaged Electron: always `false` because `KHAYATI_PACKAGED=true` and
  `NODE_ENV=production` are both set by the launcher.
- Production outside Electron: always `false`.
- Development: `false` by default; it is enabled only when
  `TYPEORM_SYNCHRONIZE=true` is explicitly set.
- Migration DataSource: always `false`, regardless of environment variables.

Schema changes must now be represented by versioned migrations. Development
`synchronize` is only a temporary opt-in convenience and must not be used to
ship schema changes.

## Commands

Run these commands from `backend`:

```powershell
npm run migration:show
npm run migration:run
npm run migration:revert
npm run migration:generate -- src/database/migrations/DescriptiveName
```

`migration:revert` can revert later migrations that implement a safe `down()`.
It cannot revert the protected initial baseline.

Every future migration must update `PRAGMA user_version` at the end of `up()`
and restore the previous value at the end of `down()`. Update
`CURRENT_SCHEMA_VERSION` in the same change.

## Historical prepare scripts audit

### `prepare-payroll-database.ts`

- Renames `workers.salaryValue` to `monthlySalary`.
- Normalizes worker salary/status values.
- Renames legacy payroll and advance tables based on old columns.
- Drops the obsolete `bonus_deductions` table.
- Status: retained for historical reference but no longer executed at startup.
  Its destructive/data-normalization operations must be split into reviewed,
  versioned migrations before any part is reused. It can be removed after the
  supported upgrade horizon no longer needs it.

### `prepare-invoice-database.ts`

- Adds missing invoice, invoice item, and payment snapshot/minor-unit columns.
- Backfills financial snapshots and integer minor-unit amounts.
- Status: temporarily retained in the one-time pre-baseline compatibility
  bridge for historical installations. New installations receive this schema
  from the baseline. Convert the remaining upgrade path into a versioned data
  migration, then retire the script.

### `prepare-invoice-payments-database.ts`

- Reconstructs missing payment history from already stored invoice paid totals.
- Status: temporarily retained as an idempotent pre-baseline data bridge. It
  must become a versioned data migration before later removal.

### `prepare-legacy-debts-database.ts`

- Creates legacy debt/payment tables and indexes when absent.
- Recovers payment rows from previously stored paid balances.
- Status: temporarily retained as an idempotent pre-baseline bridge. The
  baseline creates these tables for new installations.

### `prepare-customer-credits-database.ts`

- Adds cancellation/link columns and creates customer credit history/indexes.
- Status: temporarily retained as an idempotent pre-baseline bridge. The
  baseline creates the complete structure for new installations.

No `prepare-*.ts` script is imported by `AppModule`. Only the explicitly listed
non-destructive compatibility bridge runs before an unversioned historical
database is baselined.

