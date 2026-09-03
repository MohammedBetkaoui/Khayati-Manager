import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  CURRENT_SCHEMA_VERSION,
  STARTUP_PERFORMANCE_SCHEMA_VERSION,
} from '../schema-version';

const FINAL_QUERY_INDEXES = [
  `CREATE INDEX IF NOT EXISTS "IDX_invoices_open_due" ON "invoices" ("invoiceStatus", "dueDate", "id") WHERE "remainingAmount" > 0`,
  `CREATE INDEX IF NOT EXISTS "IDX_supplier_purchases_open" ON "supplier_purchases" ("remainingAmount" DESC, "id" DESC) WHERE "remainingAmount" > 0`,
  `CREATE INDEX IF NOT EXISTS "IDX_payrolls_worker_period_end" ON "payrolls" ("workerId", "periodEnd" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_payrolls_open" ON "payrolls" ("remainingAmount" DESC, "id" DESC) WHERE "remainingAmount" > 0`,
  `CREATE INDEX IF NOT EXISTS "IDX_expenses_open" ON "expenses" ("remainingAmount" DESC, "id" DESC) WHERE "remainingAmount" > 0`,
  `CREATE INDEX IF NOT EXISTS "IDX_expenses_recurring_due" ON "expenses" ("isRecurring", "nextDueDate", "id")`,
] as const;

const OWNER_HISTORY_INDEXES = [
  `CREATE INDEX "IDX_legacy_debts_customer_type_status_date" ON "legacy_debts" ("customerId", "type", "createdAt" DESC, "id" DESC)`,
  `CREATE INDEX "IDX_legacy_debts_supplier_type_status_date" ON "legacy_debts" ("supplierId", "type", "createdAt" DESC, "id" DESC)`,
] as const;

export class FinalizeQueryIndexes1788465600000
  implements MigrationInterface
{
  name = 'FinalizeQueryIndexes1788465600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceLegacyOwnerIndexes(queryRunner, OWNER_HISTORY_INDEXES);
    for (const statement of FINAL_QUERY_INDEXES) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of FINAL_QUERY_INDEXES) {
      const match = statement.match(/"(IDX_[^"]+)"/);
      if (match) await queryRunner.query(`DROP INDEX IF EXISTS "${match[1]}"`);
    }
    await this.replaceLegacyOwnerIndexes(queryRunner, [
      `CREATE INDEX "IDX_legacy_debts_customer_type_status_date" ON "legacy_debts" ("customerId", "type", "status", "createdAt" DESC, "id" DESC)`,
      `CREATE INDEX "IDX_legacy_debts_supplier_type_status_date" ON "legacy_debts" ("supplierId", "type", "status", "createdAt" DESC, "id" DESC)`,
    ]);
    await queryRunner.query(
      `PRAGMA user_version = ${STARTUP_PERFORMANCE_SCHEMA_VERSION}`,
    );
  }

  private async replaceLegacyOwnerIndexes(
    queryRunner: QueryRunner,
    definitions: readonly string[],
  ) {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_legacy_debts_customer_type_status_date"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_legacy_debts_supplier_type_status_date"',
    );
    for (const statement of definitions) await queryRunner.query(statement);
  }
}

export const FINAL_PERFORMANCE_INDEXES = FINAL_QUERY_INDEXES;
