import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareLegacyDebtsDatabase } from './prepare-legacy-debts-database';

describe('prepareLegacyDebtsDatabase', () => {
  let directory: string;
  let databasePath: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'khayati-legacy-debts-'));
    databasePath = join(directory, 'khayati.sqlite');
    const database = new Database(databasePath);
    database.exec(`
      CREATE TABLE "customers" ("id" integer PRIMARY KEY);
      CREATE TABLE "suppliers" ("id" integer PRIMARY KEY);
      INSERT INTO "customers" ("id") VALUES (1);
      INSERT INTO "suppliers" ("id") VALUES (1);
    `);
    database.close();
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('restores missing payment history once from the stored paid balance', () => {
    prepareLegacyDebtsDatabase(databasePath);

    const database = new Database(databasePath);
    database
      .prepare(
        `INSERT INTO "legacy_debts" (
          "type", "originalAmount", "paidAmount", "remainingAmount",
          "originalAmountMinor", "paidAmountMinor", "remainingAmountMinor",
          "status", "customerId"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'CUSTOMER_RECEIVABLE',
        70_000,
        20_000,
        50_000,
        7_000_000,
        2_000_000,
        5_000_000,
        'PARTIALLY_PAID',
        1,
      );
    database.close();

    prepareLegacyDebtsDatabase(databasePath);
    prepareLegacyDebtsDatabase(databasePath);

    const verified = new Database(databasePath, { readonly: true });
    const payments = verified
      .prepare(
        `SELECT "amount", "amountMinor", "paymentMethod", "reference"
         FROM "legacy_debt_payments"`,
      )
      .all();
    verified.close();

    expect(payments).toEqual([
      {
        amount: 20_000,
        amountMinor: 2_000_000,
        paymentMethod: 'أخرى',
        reference: 'SYSTEM-RECOVERY',
      },
    ]);
  });
});
