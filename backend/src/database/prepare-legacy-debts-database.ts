import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

export function prepareLegacyDebtsDatabase(databasePath: string) {
  if (!existsSync(databasePath)) return;

  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  try {
    database.transaction(() => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS "legacy_debts" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "type" varchar CHECK("type" IN ('CUSTOMER_RECEIVABLE','SUPPLIER_PAYABLE')) NOT NULL,
          "originalAmount" real NOT NULL,
          "paidAmount" real NOT NULL DEFAULT (0),
          "remainingAmount" real NOT NULL,
          "originalAmountMinor" integer NOT NULL,
          "paidAmountMinor" integer NOT NULL DEFAULT (0),
          "remainingAmountMinor" integer NOT NULL,
          "debtDate" date,
          "dateIsUnknown" boolean NOT NULL DEFAULT (0),
          "description" text,
          "quantity" real,
          "unit" text,
          "paperReference" text,
          "notes" text,
          "status" varchar CHECK("status" IN ('OPEN','PARTIALLY_PAID','PAID','CANCELLED')) NOT NULL DEFAULT ('OPEN'),
          "cancelledAt" datetime,
          "cancellationReason" text,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          "customerId" integer,
          "supplierId" integer,
          CONSTRAINT "CHK_legacy_debt_owner" CHECK (("type" = 'CUSTOMER_RECEIVABLE' AND "customerId" IS NOT NULL AND "supplierId" IS NULL) OR ("type" = 'SUPPLIER_PAYABLE' AND "supplierId" IS NOT NULL AND "customerId" IS NULL)),
          CONSTRAINT "FK_legacy_debt_customer" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT,
          CONSTRAINT "FK_legacy_debt_supplier" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS "legacy_debt_payments" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "amount" real NOT NULL,
          "amountMinor" integer NOT NULL,
          "paymentDate" date NOT NULL DEFAULT (CURRENT_DATE),
          "paymentMethod" varchar NOT NULL,
          "reference" text,
          "notes" text,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "legacyDebtId" integer NOT NULL,
          CONSTRAINT "FK_legacy_debt_payment" FOREIGN KEY ("legacyDebtId") REFERENCES "legacy_debts" ("id") ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS "IDX_legacy_debts_customer" ON "legacy_debts" ("customerId", "status");
        CREATE INDEX IF NOT EXISTS "IDX_legacy_debts_supplier" ON "legacy_debts" ("supplierId", "status");
        CREATE INDEX IF NOT EXISTS "IDX_legacy_debt_payments_debt" ON "legacy_debt_payments" ("legacyDebtId", "paymentDate");
      `);
    })();
  } finally {
    database.close();
  }
}
