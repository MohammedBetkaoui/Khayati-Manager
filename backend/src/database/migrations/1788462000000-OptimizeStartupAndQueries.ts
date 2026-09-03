import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  AdvanceType,
  BalanceStatus,
  PayrollPaymentMethod,
  PayrollStatus,
  SalaryType,
  StockStatus,
  SupplierStatus,
} from '../../common/enums';
import { Advance } from '../../payroll/entities/advance.entity';
import { Payroll } from '../../payroll/entities/payroll.entity';
import { SalaryPayment } from '../../payroll/entities/salary-payment.entity';
import { Worker } from '../../workers/entities/worker.entity';
import { STARTUP_PERFORMANCE_SCHEMA_VERSION } from '../schema-version';

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS "IDX_customers_last_visit" ON "customers" ("lastVisitDate" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_invoices_date" ON "invoices" ("date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_invoices_status_date" ON "invoices" ("invoiceStatus", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_invoices_payment_status_date" ON "invoices" ("paymentStatus", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_invoices_customer_date" ON "invoices" ("customerId", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_invoices_customer_status_date" ON "invoices" ("customerId", "invoiceStatus", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_invoices_open_balance" ON "invoices" ("remainingAmount") WHERE "remainingAmount" > 0`,
  `CREATE INDEX IF NOT EXISTS "IDX_invoice_items_invoice" ON "invoice_items" ("invoiceId", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_invoice_items_product" ON "invoice_items" ("productId", "invoiceId")`,
  `CREATE INDEX IF NOT EXISTS "IDX_payments_customer_active_date" ON "payments" ("customerId", "cancelledAt", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_payments_invoice_active_date" ON "payments" ("invoiceId", "cancelledAt", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_payments_date_active" ON "payments" ("date", "cancelledAt", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_supplier_purchases_supplier_date" ON "supplier_purchases" ("supplierId", "purchaseDate" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_supplier_purchases_date" ON "supplier_purchases" ("purchaseDate", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_supplier_purchases_inventory_item" ON "supplier_purchases" ("inventoryItemId")`,
  `CREATE INDEX IF NOT EXISTS "IDX_supplier_payments_supplier_date" ON "supplier_payments" ("supplierId", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_supplier_payments_purchase_date" ON "supplier_payments" ("purchaseId", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_supplier_payments_date" ON "supplier_payments" ("date", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_supplier_advances_supplier_date" ON "supplier_advances" ("supplierId", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_supplier_advances_date" ON "supplier_advances" ("date", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_legacy_debts_customer_type_status_date" ON "legacy_debts" ("customerId", "type", "status", "createdAt" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_legacy_debts_supplier_type_status_date" ON "legacy_debts" ("supplierId", "type", "status", "createdAt" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_legacy_debts_type_status" ON "legacy_debts" ("type", "status")`,
  `CREATE INDEX IF NOT EXISTS "IDX_legacy_debt_payments_debt_active_date" ON "legacy_debt_payments" ("legacyDebtId", "cancelledAt", "paymentDate" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_legacy_debt_payments_date" ON "legacy_debt_payments" ("paymentDate", "cancelledAt", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_customer_credit_customer_date" ON "customer_credit_transactions" ("customerId", "transactionDate" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_customer_credit_transaction_date" ON "customer_credit_transactions" ("transactionDate", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_customer_credit_invoice" ON "customer_credit_transactions" ("invoiceId")`,
  `CREATE INDEX IF NOT EXISTS "IDX_customer_credit_payment" ON "customer_credit_transactions" ("paymentId")`,
  `CREATE INDEX IF NOT EXISTS "IDX_customer_credit_legacy_debt" ON "customer_credit_transactions" ("legacyDebtId")`,
  `CREATE INDEX IF NOT EXISTS "IDX_customer_credit_legacy_debt_payment" ON "customer_credit_transactions" ("legacyDebtPaymentId")`,
  `CREATE INDEX IF NOT EXISTS "IDX_customer_credit_reversal" ON "customer_credit_transactions" ("reversalOfId")`,
  `CREATE INDEX IF NOT EXISTS "IDX_payrolls_worker_month_status" ON "payrolls" ("workerId", "salaryMonth", "status")`,
  `CREATE INDEX IF NOT EXISTS "IDX_payrolls_period_status" ON "payrolls" ("periodEnd" DESC, "periodStart", "status", "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_salary_payments_payroll_date" ON "salary_payments" ("payrollId", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_salary_payments_worker_date" ON "salary_payments" ("workerId", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_salary_payments_date" ON "salary_payments" ("date", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_advances_worker_date" ON "advances" ("workerId", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_advances_status" ON "advances" ("status")`,
  `CREATE INDEX IF NOT EXISTS "IDX_expenses_active_date" ON "expenses" ("archivedAt", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_expenses_date" ON "expenses" ("date", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_finished_products_status_quantity" ON "finished_products" ("status", "quantityAvailable" DESC, "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_product_variants_product_active" ON "product_variants" ("productId", "active", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_production_batches_product_date" ON "production_batches" ("productId", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_production_batches_date" ON "production_batches" ("date", "id")`,
  `CREATE INDEX IF NOT EXISTS "IDX_product_stock_movements_product_date" ON "product_stock_movements" ("productId", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_inventory_items_supplier" ON "inventory_items" ("supplierEntityId")`,
  `CREATE INDEX IF NOT EXISTS "IDX_inventory_items_status" ON "inventory_items" ("status")`,
  `CREATE INDEX IF NOT EXISTS "IDX_stock_movements_item_date" ON "stock_movements" ("inventoryItemId", "date" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_sales_orders_customer_date" ON "sales_orders" ("customerId", "orderDate" DESC, "id" DESC)`,
  `CREATE INDEX IF NOT EXISTS "IDX_sales_order_items_order" ON "sales_order_items" ("orderId", "id")`,
] as const;

function money(value: unknown) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function optionalText(value: unknown) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

export class OptimizeStartupAndQueries1788462000000
  implements MigrationInterface
{
  name = 'OptimizeStartupAndQueries1788462000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of INDEXES) {
      await queryRunner.query(statement);
    }

    await this.migrateLegacyPayroll(queryRunner);
    await this.normalizeInventory(queryRunner);
    await this.refreshMaterializedBusinessTotals(queryRunner);
    await queryRunner.query(
      `PRAGMA user_version = ${STARTUP_PERFORMANCE_SCHEMA_VERSION}`,
    );
  }

  public async down(): Promise<void> {
    throw new Error(
      'Schema version 2 contains one-time historical data backfills and cannot be safely reverted.',
    );
  }

  private async tableExists(queryRunner: QueryRunner, table: string) {
    const rows = (await queryRunner.query(
      `SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [table],
    )) as Array<{ present: number }>;
    return rows.length > 0;
  }

  private async migrateLegacyPayroll(queryRunner: QueryRunner) {
    if (await this.tableExists(queryRunner, 'payrolls_legacy')) {
      const rows = (await queryRunner.query(
        'SELECT * FROM "payrolls_legacy" ORDER BY "id"',
      )) as Record<string, unknown>[];
      const workerRepository = queryRunner.manager.getRepository(Worker);
      const payrollRepository = queryRunner.manager.getRepository(Payroll);
      const paymentRepository =
        queryRunner.manager.getRepository(SalaryPayment);

      for (const row of rows) {
        const workerId = Number(row.workerId ?? 0);
        const worker = await workerRepository.findOne({
          where: { id: workerId },
        });
        if (!worker) continue;
        const periodStart = String(row.periodStart ?? '').slice(0, 10);
        const periodEnd = String(row.periodEnd ?? '').slice(0, 10);
        const duplicate = await payrollRepository.findOne({
          where: { worker: { id: workerId }, periodStart, periodEnd },
        });
        if (duplicate) continue;

        const isPiece = String(row.salaryType ?? '') === SalaryType.PIECE;
        const gross = money(
          Number(isPiece ? row.productionAmount : row.baseSalary) ||
            Number(row.netSalary) ||
            0,
        );
        const amountDue = money(Number(row.netSalary ?? gross));
        const paid = Math.min(gross, money(row.paidAmount ?? 0));
        const payroll = await payrollRepository.save(
          payrollRepository.create({
            worker,
            periodStart,
            periodEnd,
            salaryMonth: isPiece ? null : periodStart.slice(0, 7),
            salaryTypeSnapshot: isPiece ? SalaryType.PIECE : SalaryType.MONTHLY,
            monthlySalarySnapshot: isPiece ? 0 : Number(row.baseSalary ?? 0),
            installmentsInMonth: isPiece ? 0 : 4,
            installmentNumber: isPiece ? 0 : 1,
            piecesCompleted: Number(row.piecesCompleted ?? 0),
            piecePrice: Number(row.piecePrice ?? 0),
            grossAmount: gross,
            advanceDeduction: Number(row.advances ?? 0),
            loanDeduction: 0,
            otherDeductions: Number(row.deductions ?? 0),
            amountDue,
            paidAmount: paid,
            remainingAmount: money(amountDue - paid),
            status:
              paid <= 0
                ? PayrollStatus.CALCULATED
                : paid >= amountDue
                  ? PayrollStatus.PAID
                  : PayrollStatus.PARTIALLY_PAID,
            notes: optionalText(row.notes),
          }),
        );
        if (paid > 0) {
          await paymentRepository.save(
            paymentRepository.create({
              payroll,
              worker,
              amount: paid,
              date: String(row.paymentDate ?? periodEnd).slice(0, 10),
              method: PayrollPaymentMethod.CASH,
              notes: 'Paiement migre depuis ancien systeme',
            }),
          );
        }
      }
      await queryRunner.query('DROP TABLE "payrolls_legacy"');
    }

    if (await this.tableExists(queryRunner, 'advances_legacy')) {
      const rows = (await queryRunner.query(
        'SELECT * FROM "advances_legacy" ORDER BY "id"',
      )) as Record<string, unknown>[];
      const workerRepository = queryRunner.manager.getRepository(Worker);
      const advanceRepository = queryRunner.manager.getRepository(Advance);
      for (const row of rows) {
        const worker = await workerRepository.findOne({
          where: { id: Number(row.workerId ?? 0) },
        });
        if (!worker) continue;
        const amount = money(row.amount ?? 0);
        const settled = Boolean(row.isDeducted);
        await advanceRepository.save(
          advanceRepository.create({
            worker,
            amount,
            deductedAmount: settled ? amount : 0,
            remainingAmount: settled ? 0 : amount,
            date: String(row.date ?? '').slice(0, 10),
            type: AdvanceType.SALARY,
            status: settled ? BalanceStatus.SETTLED : BalanceStatus.OPEN,
            notes: optionalText(row.notes),
          }),
        );
      }
      await queryRunner.query('DROP TABLE "advances_legacy"');
    }
  }

  private async normalizeInventory(queryRunner: QueryRunner) {
    await queryRunner.query(
      `INSERT INTO "suppliers" (
          "name", "status", "totalPurchases", "totalPaid", "totalDebt", "createdAt", "updatedAt"
        )
        SELECT MIN(TRIM(item."supplier")), ?, 0, 0, 0, datetime('now'), datetime('now')
          FROM "inventory_items" item
         WHERE item."supplierEntityId" IS NULL
           AND TRIM(COALESCE(item."supplier", '')) != ''
           AND NOT EXISTS (
             SELECT 1 FROM "suppliers" supplier
              WHERE LOWER(supplier."name") = LOWER(TRIM(item."supplier"))
           )
         GROUP BY LOWER(TRIM(item."supplier"))`,
      [SupplierStatus.ACTIVE],
    );
    await queryRunner.query(
      `UPDATE "inventory_items"
          SET "supplierEntityId" = (
            SELECT supplier."id" FROM "suppliers" supplier
             WHERE LOWER(supplier."name") = LOWER(TRIM("inventory_items"."supplier"))
             ORDER BY supplier."id" ASC LIMIT 1
          )
        WHERE "supplierEntityId" IS NULL
          AND TRIM(COALESCE("supplier", '')) != ''`,
    );
    await queryRunner.query(
      `UPDATE "inventory_items"
          SET "supplier" = (
            SELECT supplier."name" FROM "suppliers" supplier
             WHERE supplier."id" = "inventory_items"."supplierEntityId"
          )
        WHERE "supplierEntityId" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "inventory_items"
          SET "status" = CASE
            WHEN "quantity" <= 0 THEN ?
            WHEN "quantity" <= "minStockAlert" THEN ?
            ELSE ?
          END`,
      [StockStatus.OUT_OF_STOCK, StockStatus.LOW_STOCK, StockStatus.AVAILABLE],
    );
  }

  private async refreshMaterializedBusinessTotals(queryRunner: QueryRunner) {
    await queryRunner.query(`
      UPDATE "customers"
         SET "totalPurchases" = COALESCE((
               SELECT SUM(invoice."totalAmount") FROM "invoices" invoice
                WHERE invoice."customerId" = "customers"."id"
                  AND invoice."invoiceStatus" = 'ISSUED'
             ), 0),
             "totalPaid" = COALESCE((
               SELECT SUM(invoice."paidAmount") FROM "invoices" invoice
                WHERE invoice."customerId" = "customers"."id"
                  AND invoice."invoiceStatus" = 'ISSUED'
             ), 0),
             "totalDebt" = COALESCE((
               SELECT SUM(invoice."remainingAmount") FROM "invoices" invoice
                WHERE invoice."customerId" = "customers"."id"
                  AND invoice."invoiceStatus" = 'ISSUED'
             ), 0),
             "firstVisitDate" = COALESCE((
               SELECT MIN(invoice."date") FROM "invoices" invoice
                WHERE invoice."customerId" = "customers"."id"
                  AND invoice."invoiceStatus" = 'ISSUED'
             ), "firstVisitDate"),
             "lastVisitDate" = COALESCE((
               SELECT MAX(invoice."date") FROM "invoices" invoice
                WHERE invoice."customerId" = "customers"."id"
                  AND invoice."invoiceStatus" = 'ISSUED'
             ), "lastVisitDate")
    `);

    await queryRunner.query(`
      UPDATE "suppliers"
         SET "totalPurchases" = COALESCE((
               SELECT SUM(purchase."totalAmount") FROM "supplier_purchases" purchase
                WHERE purchase."supplierId" = "suppliers"."id"
             ), 0),
             "totalPaid" = COALESCE((
               SELECT SUM(payment."amount") FROM "supplier_payments" payment
                WHERE payment."supplierId" = "suppliers"."id"
             ), 0) + COALESCE((
               SELECT SUM(advance."amount") FROM "supplier_advances" advance
                WHERE advance."supplierId" = "suppliers"."id"
             ), 0),
             "totalDebt" = MAX(
               COALESCE((
                 SELECT SUM(purchase."totalAmount") FROM "supplier_purchases" purchase
                  WHERE purchase."supplierId" = "suppliers"."id"
               ), 0) - COALESCE((
                 SELECT SUM(payment."amount") FROM "supplier_payments" payment
                  WHERE payment."supplierId" = "suppliers"."id"
               ), 0) - COALESCE((
                 SELECT SUM(advance."amount") FROM "supplier_advances" advance
                  WHERE advance."supplierId" = "suppliers"."id"
               ), 0),
               0
             ),
             "lastPurchaseDate" = (
               SELECT MAX(purchase."purchaseDate") FROM "supplier_purchases" purchase
                WHERE purchase."supplierId" = "suppliers"."id"
             )
    `);
  }
}

export const STARTUP_PERFORMANCE_INDEXES = INDEXES;
