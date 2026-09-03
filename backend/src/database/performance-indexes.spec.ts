import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareDatabaseForStartup } from './database-bootstrap';

function environment(databasePath: string): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    KHAYATI_PACKAGED: 'true',
    KHAYATI_DATABASE_PATH: databasePath,
    TYPEORM_SYNCHRONIZE: 'false',
  };
}

function queryPlan(
  database: Database.Database,
  sql: string,
  parameters: unknown[],
) {
  return (
    database
      .prepare(`EXPLAIN QUERY PLAN ${sql}`)
      .all(...parameters) as Array<{ detail: string }>
  )
    .map((row) => row.detail)
    .join('\n');
}

describe('performance indexes', () => {
  let temporaryDirectory: string;
  let databasePath: string;

  beforeAll(async () => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'khayati-indexes-'));
    databasePath = join(temporaryDirectory, 'indexed.sqlite');
    await prepareDatabaseForStartup(environment(databasePath));
  });

  afterAll(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('creates a production database at the current indexed schema version', () => {
    expect(existsSync(databasePath)).toBe(true);
    const database = new Database(databasePath, { readonly: true });
    try {
      expect(database.pragma('user_version', { simple: true })).toBe(3);
      expect(database.pragma('integrity_check')).toEqual([
        { integrity_check: 'ok' },
      ]);
      expect(database.pragma('foreign_key_check')).toEqual([]);
    } finally {
      database.close();
    }
  });

  it.each([
    {
      name: 'customer invoices',
      sql: `SELECT id FROM invoices
             WHERE customerId = ? AND invoiceStatus = ?
             ORDER BY date DESC, id DESC LIMIT 20`,
      parameters: [1, 'ISSUED'],
      index: 'IDX_invoices_customer_status_date',
    },
    {
      name: 'customer payments',
      sql: `SELECT id FROM payments
             WHERE customerId = ? AND cancelledAt IS NULL
             ORDER BY date DESC, id DESC LIMIT 20`,
      parameters: [1],
      index: 'IDX_payments_customer_active_date',
    },
    {
      name: 'supplier purchases',
      sql: `SELECT id FROM supplier_purchases
             WHERE supplierId = ?
             ORDER BY purchaseDate DESC, id DESC LIMIT 20`,
      parameters: [1],
      index: 'IDX_supplier_purchases_supplier_date',
    },
    {
      name: 'supplier payments',
      sql: `SELECT id FROM supplier_payments
             WHERE supplierId = ?
             ORDER BY date DESC, id DESC LIMIT 20`,
      parameters: [1],
      index: 'IDX_supplier_payments_supplier_date',
    },
    {
      name: 'legacy customer receivables',
      sql: `SELECT id FROM legacy_debts
             WHERE customerId = ? AND type = ?
             ORDER BY createdAt DESC, id DESC LIMIT 20`,
      parameters: [1, 'CUSTOMER_RECEIVABLE'],
      index: 'IDX_legacy_debts_customer_type_status_date',
    },
    {
      name: 'worker payroll history',
      sql: `SELECT id FROM payrolls
             WHERE workerId = ?
             ORDER BY periodEnd DESC, id DESC LIMIT 20`,
      parameters: [1],
      index: 'IDX_payrolls_worker_period_end',
    },
    {
      name: 'active expenses by period',
      sql: `SELECT id FROM expenses
             WHERE archivedAt IS NULL AND date BETWEEN ? AND ?
             ORDER BY date DESC, id DESC LIMIT 100`,
      parameters: ['2026-01-01', '2026-12-31'],
      index: 'IDX_expenses_active_date',
    },
  ])('uses the expected index for $name', ({ sql, parameters, index }) => {
    const database = new Database(databasePath, { readonly: true });
    try {
      expect(queryPlan(database, sql, parameters)).toContain(index);
    } finally {
      database.close();
    }
  });
});
