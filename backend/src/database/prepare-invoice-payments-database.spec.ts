import Database from 'better-sqlite3';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { PaymentMethod } from '../common/enums';
import { prepareInvoicePaymentsDatabase } from './prepare-invoice-payments-database';

describe('prepareInvoicePaymentsDatabase', () => {
  const databasePath = join(
    process.cwd(),
    'database',
    `payment-migration-test-${process.pid}.sqlite`,
  );

  afterEach(() => {
    const directory = join(process.cwd(), 'database');
    for (const file of [databasePath, `${databasePath}-journal`]) {
      if (existsSync(file)) rmSync(file, { force: true });
    }
    const backupPrefix = `payment-migration-test-${process.pid}.sqlite.backup-before-payment-history-`;
    for (const entry of readdirSync(directory)) {
      if (entry.startsWith(backupPrefix)) {
        rmSync(join(directory, entry), { force: true });
      }
    }
  });

  it('backfills only the missing historical balance and remains idempotent', () => {
    const database = new Database(databasePath);
    database.exec(`
      CREATE TABLE invoices (
        id INTEGER PRIMARY KEY,
        customerId INTEGER NOT NULL,
        date TEXT NOT NULL,
        paidAmountMinor INTEGER NOT NULL
      );
      CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL,
        invoiceId INTEGER,
        amount REAL NOT NULL,
        amountMinor INTEGER NOT NULL,
        paymentMethod TEXT NOT NULL,
        date TEXT NOT NULL,
        reference TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      INSERT INTO invoices (id, customerId, date, paidAmountMinor)
      VALUES (1, 7, '2026-08-25', 1000000);
    `);
    database
      .prepare(
        `INSERT INTO payments
          (customerId, invoiceId, amount, amountMinor, paymentMethod, date,
           createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(7, 1, 4000, 400000, PaymentMethod.CASH, '2026-08-25');
    database.close();

    prepareInvoicePaymentsDatabase(databasePath);
    prepareInvoicePaymentsDatabase(databasePath);

    const verification = new Database(databasePath, { readonly: true });
    const result = verification
      .prepare(
        `SELECT COUNT(*) AS count, SUM(amountMinor) AS total,
                SUM(CASE WHEN paymentMethod = ? THEN 1 ELSE 0 END) AS migrated
           FROM payments WHERE invoiceId = 1`,
      )
      .get(PaymentMethod.OTHER) as {
      count: number;
      total: number;
      migrated: number;
    };
    verification.close();

    expect(result).toEqual({ count: 2, total: 1000000, migrated: 1 });
  });
});
