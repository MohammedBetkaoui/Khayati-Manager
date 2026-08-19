import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

function tableExists(database: Database.Database, table: string) {
  return Boolean(
    database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table),
  );
}

function columns(database: Database.Database, table: string) {
  if (!tableExists(database, table)) return new Set<string>();
  const rows = database.prepare(`PRAGMA table_info(\"${table}\")`).all() as {
    name: string;
  }[];
  return new Set(rows.map((row) => row.name));
}

export function preparePayrollDatabase(databasePath: string) {
  if (!existsSync(databasePath)) return;

  const database = new Database(databasePath);
  database.pragma('foreign_keys = OFF');

  try {
    database.transaction(() => {
      const workerColumns = columns(database, 'workers');
      if (
        workerColumns.has('salaryValue') &&
        !workerColumns.has('monthlySalary')
      ) {
        database.exec(
          'ALTER TABLE "workers" RENAME COLUMN "salaryValue" TO "monthlySalary"',
        );
      }

      if (tableExists(database, 'workers')) {
        database
          .prepare(
            "UPDATE workers SET monthlySalary = 0 WHERE salaryType NOT IN ('شهري', 'حسب القطعة')",
          )
          .run();
        database
          .prepare(
            "UPDATE workers SET salaryType = 'شهري' WHERE salaryType NOT IN ('شهري', 'حسب القطعة')",
          )
          .run();
        database
          .prepare(
            "UPDATE workers SET monthlySalary = 0 WHERE salaryType = 'حسب القطعة'",
          )
          .run();
        database
          .prepare(
            "UPDATE workers SET status = 'غير نشط' WHERE status = 'متوقف'",
          )
          .run();
      }

      const payrollColumns = columns(database, 'payrolls');
      if (
        payrollColumns.has('bonuses') &&
        !tableExists(database, 'payrolls_legacy')
      ) {
        database.exec('ALTER TABLE "payrolls" RENAME TO "payrolls_legacy"');
      }

      const advanceColumns = columns(database, 'advances');
      if (
        advanceColumns.has('deductionMethod') &&
        !tableExists(database, 'advances_legacy')
      ) {
        database.exec('ALTER TABLE "advances" RENAME TO "advances_legacy"');
      }

      if (tableExists(database, 'bonus_deductions')) {
        database.exec('DROP TABLE "bonus_deductions"');
      }
    })();
  } finally {
    database.pragma('foreign_keys = ON');
    database.close();
  }
}
