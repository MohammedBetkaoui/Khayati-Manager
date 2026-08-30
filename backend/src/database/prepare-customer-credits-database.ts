import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

function tableExists(database: Database.Database, table: string) {
  return Boolean(
    database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table),
  );
}

function columnNames(database: Database.Database, table: string) {
  if (!tableExists(database, table)) return new Set<string>();
  return new Set(
    (
      database.prepare(`PRAGMA table_info("${table}")`).all() as {
        name: string;
      }[]
    ).map((column) => column.name),
  );
}

function addColumn(
  database: Database.Database,
  table: string,
  column: string,
  definition: string,
) {
  if (!tableExists(database, table) || columnNames(database, table).has(column)) {
    return;
  }
  database.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
}

export function prepareCustomerCreditsDatabase(databasePath: string) {
  if (!existsSync(databasePath)) return;
  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  try {
    database.transaction(() => {
      addColumn(database, 'payments', 'cancelledAt', 'datetime NULL');
      addColumn(database, 'payments', 'cancellationReason', 'text NULL');
      addColumn(database, 'legacy_debt_payments', 'cancelledAt', 'datetime NULL');
      addColumn(
        database,
        'legacy_debt_payments',
        'cancellationReason',
        'text NULL',
      );
      addColumn(
        database,
        'customer_credit_transactions',
        'legacyDebtPaymentId',
        'integer NULL REFERENCES legacy_debt_payments(id)',
      );
      database.exec(`
        CREATE TABLE IF NOT EXISTS customer_credit_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          customerId INTEGER NOT NULL,
          type varchar NOT NULL,
          direction varchar NOT NULL,
          amount real NOT NULL,
          amountMinor integer NOT NULL,
          transactionDate date NOT NULL DEFAULT (CURRENT_DATE),
          paymentMethod varchar NULL,
          invoiceId integer NULL,
          paymentId integer NULL,
          legacyDebtId integer NULL,
          legacyDebtPaymentId integer NULL,
          reversalOfId integer NULL,
          balanceAfter real NOT NULL DEFAULT (0),
          balanceAfterMinor integer NOT NULL DEFAULT (0),
          reference text NULL,
          notes text NULL,
          reversedAt datetime NULL,
          reversalReason text NULL,
          createdAt datetime NOT NULL DEFAULT (datetime('now')),
          CONSTRAINT FK_credit_customer FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE RESTRICT,
          CONSTRAINT FK_credit_invoice FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE RESTRICT,
          CONSTRAINT FK_credit_payment FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE RESTRICT,
          CONSTRAINT FK_credit_legacy_debt FOREIGN KEY (legacyDebtId) REFERENCES legacy_debts(id) ON DELETE RESTRICT,
          CONSTRAINT FK_credit_legacy_debt_payment FOREIGN KEY (legacyDebtPaymentId) REFERENCES legacy_debt_payments(id) ON DELETE RESTRICT,
          CONSTRAINT FK_credit_reversal FOREIGN KEY (reversalOfId) REFERENCES customer_credit_transactions(id) ON DELETE RESTRICT
        );
        CREATE INDEX IF NOT EXISTS IDX_customer_credit_customer_date
          ON customer_credit_transactions(customerId, transactionDate);
        CREATE INDEX IF NOT EXISTS IDX_customer_credit_invoice
          ON customer_credit_transactions(invoiceId);
        CREATE INDEX IF NOT EXISTS IDX_customer_credit_legacy_debt
          ON customer_credit_transactions(legacyDebtId);
        CREATE INDEX IF NOT EXISTS IDX_customer_credit_legacy_debt_payment
          ON customer_credit_transactions(legacyDebtPaymentId);
      `);
    })();
  } finally {
    database.close();
  }
}
