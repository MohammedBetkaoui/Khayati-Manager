import Database from 'better-sqlite3';
import { copyFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { PaymentMethod } from '../common/enums';

type MissingPaymentRow = {
  invoiceId: number;
  customerId: number;
  invoiceDate: string;
  missingAmountMinor: number;
};

function tableExists(database: Database.Database, table: string) {
  return Boolean(
    database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table),
  );
}

function columns(database: Database.Database, table: string) {
  if (!tableExists(database, table)) return new Set<string>();
  const rows = database.prepare(`PRAGMA table_info("${table}")`).all() as {
    name: string;
  }[];
  return new Set(rows.map((row) => row.name));
}

function findMissingPayments(database: Database.Database) {
  if (
    !tableExists(database, 'invoices') ||
    !tableExists(database, 'payments')
  ) {
    return [];
  }
  const invoiceColumns = columns(database, 'invoices');
  const paymentColumns = columns(database, 'payments');
  if (
    !invoiceColumns.has('paidAmountMinor') ||
    !paymentColumns.has('amountMinor') ||
    !paymentColumns.has('invoiceId')
  ) {
    return [];
  }

  return database
    .prepare(
      `SELECT invoice.id AS invoiceId,
              invoice.customerId AS customerId,
              invoice.date AS invoiceDate,
              invoice.paidAmountMinor - COALESCE(SUM(payment.amountMinor), 0)
                AS missingAmountMinor
         FROM invoices invoice
         LEFT JOIN payments payment ON payment.invoiceId = invoice.id
        GROUP BY invoice.id
       HAVING missingAmountMinor > 0`,
    )
    .all() as MissingPaymentRow[];
}

function createBackup(databasePath: string) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
  const backupName = `${basename(databasePath)}.backup-before-payment-history-${timestamp}`;
  copyFileSync(databasePath, join(dirname(databasePath), backupName));
}

export function prepareInvoicePaymentsDatabase(databasePath: string) {
  if (!existsSync(databasePath)) return;

  const inspectionDatabase = new Database(databasePath, { readonly: true });
  const missingPayments = findMissingPayments(inspectionDatabase);
  inspectionDatabase.close();
  if (!missingPayments.length) return;

  createBackup(databasePath);
  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  try {
    const insertPayment = database.prepare(
      `INSERT INTO payments
        (customerId, invoiceId, amount, amountMinor, paymentMethod, date,
         reference, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    );

    database.transaction(() => {
      for (const row of missingPayments) {
        insertPayment.run(
          row.customerId,
          row.invoiceId,
          row.missingAmountMinor / 100,
          row.missingAmountMinor,
          PaymentMethod.OTHER,
          row.invoiceDate,
          'Historical paid balance imported during invoice migration',
        );
      }
    })();
  } finally {
    database.close();
  }
}
