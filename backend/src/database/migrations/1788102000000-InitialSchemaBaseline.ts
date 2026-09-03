import { MigrationInterface, QueryRunner } from 'typeorm';
import { INITIAL_SCHEMA_VERSION } from '../schema-version';

const HISTORICAL_SCHEMA_TABLES = [
  'advances',
  'attendances',
  'customer_credit_transactions',
  'customer_measurements',
  'customer_notes',
  'customers',
  'document_sequences',
  'expenses',
  'finished_products',
  'inventory_items',
  'invoice_items',
  'invoices',
  'legacy_debt_payments',
  'legacy_debts',
  'loan_repayments',
  'material_consumptions',
  'payments',
  'payroll_advance_deductions',
  'payroll_loan_deductions',
  'payrolls',
  'piece_prices',
  'product_stock_movements',
  'product_variants',
  'production_batches',
  'production_materials',
  'production_stages',
  'salary_payments',
  'sales_order_items',
  'sales_orders',
  'settings',
  'stock_movements',
  'supplier_advances',
  'supplier_payments',
  'supplier_purchases',
  'suppliers',
  'worker_loans',
  'worker_productions',
  'worker_role_options',
  'workers',
  'workshop_settings',
] as const;

export class InitialSchemaBaseline1788102000000 implements MigrationInterface {
  name = 'InitialSchemaBaseline1788102000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT name FROM sqlite_master
             WHERE type = 'table'
               AND name NOT LIKE 'sqlite_%'
               AND name != 'typeorm_migrations'`,
    )) as Array<{ name: string }>;
    const existingTables = new Set(rows.map((row) => row.name));

    if (existingTables.size > 0) {
      const missingTables = HISTORICAL_SCHEMA_TABLES.filter(
        (table) => !existingTables.has(table),
      );
      if (missingTables.length > 0) {
        throw new Error(
          `Refusing to baseline an incomplete historical database. Missing tables: ${missingTables.join(', ')}`,
        );
      }

      await queryRunner.query(
        `PRAGMA user_version = ${INITIAL_SCHEMA_VERSION}`,
      );
      return;
    }

    await queryRunner.query(`
            CREATE TABLE "product_variants" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "sku" varchar(100) NOT NULL,
                "size" text,
                "color" text,
                "quantityProduced" integer NOT NULL DEFAULT (0),
                "quantityAvailable" integer NOT NULL DEFAULT (0),
                "quantitySold" integer NOT NULL DEFAULT (0),
                "salePrice" real,
                "active" boolean NOT NULL DEFAULT (1),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productId" integer,
                CONSTRAINT "UQ_46f236f21640f9da218a063a866" UNIQUE ("sku")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "product_stock_movements" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar CHECK(
                    "type" IN ('إنتاج', 'بيع', 'تعديل', 'إرجاع', 'تلف')
                ) NOT NULL,
                "quantity" integer NOT NULL,
                "previousQuantity" integer NOT NULL,
                "newQuantity" integer NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "reference" text,
                "reason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productId" integer,
                "variantId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "finished_products" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar(180) NOT NULL,
                "sku" varchar(80) NOT NULL,
                "category" varchar CHECK(
                    "category" IN (
                        'فستان',
                        'سروال',
                        'قميص',
                        'طقم',
                        'لباس تقليدي',
                        'زي موحد',
                        'أخرى'
                    )
                ) NOT NULL,
                "description" text,
                "imageUrl" text,
                "creationDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "salePrice" real NOT NULL DEFAULT (0),
                "estimatedProductionCost" real NOT NULL DEFAULT (0),
                "quantityProduced" integer NOT NULL DEFAULT (0),
                "quantityAvailable" integer NOT NULL DEFAULT (0),
                "quantitySold" integer NOT NULL DEFAULT (0),
                "minStockAlert" integer NOT NULL DEFAULT (0),
                "status" varchar CHECK("status" IN ('نشط', 'غير نشط', 'مؤرشف')) NOT NULL DEFAULT ('نشط'),
                "notes" text,
                "archivedAt" datetime,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_41f12714a9aa3bbdd9af871d876" UNIQUE ("sku")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "production_materials" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "materialName" varchar NOT NULL,
                "unit" varchar NOT NULL,
                "quantityUsed" real NOT NULL,
                "unitCost" real NOT NULL DEFAULT (0),
                "totalCost" real NOT NULL DEFAULT (0),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productionBatchId" integer,
                "inventoryItemId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "production_batches" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "batchNumber" varchar(80) NOT NULL,
                "quantityProduced" integer NOT NULL,
                "materialCost" real NOT NULL DEFAULT (0),
                "additionalCost" real NOT NULL DEFAULT (0),
                "totalCost" real NOT NULL DEFAULT (0),
                "unitCost" real NOT NULL DEFAULT (0),
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productId" integer,
                "variantId" integer,
                CONSTRAINT "UQ_3dc31412605975315d506df806d" UNIQUE ("batchNumber")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "material_consumptions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "quantityUsed" real NOT NULL,
                "date" date NOT NULL,
                "orderId" text,
                "cost" real NOT NULL DEFAULT (0),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "inventoryItemId" integer,
                "productionBatchId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "stock_movements" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "movementType" varchar CHECK(
                    "movementType" IN (
                        'دخول مخزون',
                        'خروج مخزون',
                        'تعديل كمية',
                        'تلف / ضياع',
                        'استهلاك للإنتاج'
                    )
                ) NOT NULL,
                "quantity" real NOT NULL,
                "previousQuantity" real NOT NULL DEFAULT (0),
                "newQuantity" real NOT NULL DEFAULT (0),
                "unit" text,
                "reason" text,
                "linkedOrderId" text,
                "date" date NOT NULL,
                "notes" text,
                "performedBy" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "inventoryItemId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "supplier_payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ) NOT NULL DEFAULT ('نقداً'),
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "reference" text,
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierId" integer,
                "purchaseId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "supplier_purchases" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "materialName" varchar NOT NULL,
                "materialColor" text,
                "quantityPurchased" real NOT NULL,
                "unit" varchar NOT NULL,
                "totalAmount" real NOT NULL,
                "paidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "paymentStatus" varchar CHECK(
                    "paymentStatus" IN ('مدفوع', 'مدفوع جزئياً', 'غير مدفوع')
                ) NOT NULL DEFAULT ('غير مدفوع'),
                "purchaseDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierId" integer,
                "inventoryItemId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "inventory_items" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "reference" text,
                "category" varchar CHECK(
                    "category" IN (
                        'أقمشة',
                        'خيوط',
                        'أزرار',
                        'سحابات',
                        'إكسسوارات',
                        'تغليف',
                        'أدوات'
                    )
                ) NOT NULL,
                "type" text,
                "color" text,
                "quantity" real NOT NULL DEFAULT (0),
                "unit" varchar NOT NULL,
                "unitPrice" real NOT NULL DEFAULT (0),
                "supplier" text,
                "minStockAlert" real NOT NULL DEFAULT (0),
                "location" text,
                "status" varchar CHECK("status" IN ('متوفر', 'قارب على النفاد', 'نفد')) NOT NULL DEFAULT ('متوفر'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierEntityId" integer,
                CONSTRAINT "UQ_452583a3976cadc318d8b1f8993" UNIQUE ("reference")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "supplier_advances" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "appliedAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "debtBefore" real,
                "debtAfter" real,
                "status" varchar CHECK("status" IN ('مفتوحة', 'مستعملة', 'مغلقة')) NOT NULL DEFAULT ('مفتوحة'),
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "suppliers" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "phone" text,
                "address" text,
                "city" text,
                "status" varchar CHECK("status" IN ('نشط', 'غير نشط', 'مؤرشف')) NOT NULL DEFAULT ('نشط'),
                "totalPurchases" real NOT NULL DEFAULT (0),
                "totalPaid" real NOT NULL DEFAULT (0),
                "totalDebt" real NOT NULL DEFAULT (0),
                "lastPurchaseDate" date,
                "notes" text,
                "archivedAt" datetime,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_5b5720d9645cee7396595a16c93" UNIQUE ("name")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "invoice_items" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "description" varchar NOT NULL,
                "productName" text,
                "productType" varchar,
                "productSku" text,
                "reference" text,
                "variantLabel" text,
                "variantSnapshot" text,
                "size" text,
                "color" text,
                "quantity" integer NOT NULL DEFAULT (1),
                "unitPrice" real NOT NULL DEFAULT (0),
                "total" real NOT NULL DEFAULT (0),
                "unitPriceMinor" integer NOT NULL DEFAULT (0),
                "totalMinor" integer NOT NULL DEFAULT (0),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "invoiceId" integer,
                "productId" integer,
                "variantId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "amountMinor" integer NOT NULL DEFAULT (0),
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ) NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "reference" text,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer,
                "invoiceId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "invoices" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "invoiceNumber" varchar NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "dueDate" date,
                "subtotal" real NOT NULL DEFAULT (0),
                "discount" real NOT NULL DEFAULT (0),
                "discountType" varchar CHECK(
                    "discountType" IN ('NONE', 'FIXED', 'PERCENTAGE')
                ) NOT NULL DEFAULT ('NONE'),
                "discountValue" real NOT NULL DEFAULT (0),
                "discountAmount" real NOT NULL DEFAULT (0),
                "taxEnabled" boolean NOT NULL DEFAULT (0),
                "taxRate" real NOT NULL DEFAULT (0),
                "taxAmount" real NOT NULL DEFAULT (0),
                "totalAmount" real NOT NULL DEFAULT (0),
                "paidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "paymentStatus" varchar CHECK(
                    "paymentStatus" IN ('مدفوعة', 'مدفوعة جزئياً', 'غير مدفوعة')
                ) NOT NULL DEFAULT ('غير مدفوعة'),
                "invoiceStatus" varchar CHECK(
                    "invoiceStatus" IN ('DRAFT', 'ISSUED', 'CANCELLED')
                ) NOT NULL DEFAULT ('ISSUED'),
                "currency" varchar(3) NOT NULL DEFAULT ('DZD'),
                "subtotalMinor" integer NOT NULL DEFAULT (0),
                "discountAmountMinor" integer NOT NULL DEFAULT (0),
                "taxAmountMinor" integer NOT NULL DEFAULT (0),
                "totalAmountMinor" integer NOT NULL DEFAULT (0),
                "paidAmountMinor" integer NOT NULL DEFAULT (0),
                "remainingAmountMinor" integer NOT NULL DEFAULT (0),
                "customerSnapshot" text,
                "workshopSnapshot" text,
                "orderNumberSnapshot" text,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer NOT NULL,
                "orderId" integer,
                CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber"),
                CONSTRAINT "REL_a58a78a0e0031dd93a2f56f1e8" UNIQUE ("orderId")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "sales_order_items" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "productName" varchar(180) NOT NULL,
                "description" text,
                "reference" text,
                "variantSnapshot" text,
                "size" text,
                "color" text,
                "quantity" integer NOT NULL,
                "unitPrice" real NOT NULL DEFAULT (0),
                "total" real NOT NULL DEFAULT (0),
                "unitPriceMinor" integer NOT NULL DEFAULT (0),
                "totalMinor" integer NOT NULL DEFAULT (0),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "orderId" integer NOT NULL,
                "productId" integer,
                "variantId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "sales_orders" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "orderNumber" varchar(32) NOT NULL,
                "orderDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "dueDate" date,
                "status" varchar CHECK(
                    "status" IN ('DRAFT', 'CONFIRMED', 'INVOICED', 'CANCELLED')
                ) NOT NULL DEFAULT ('DRAFT'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer NOT NULL,
                CONSTRAINT "UQ_ea901f7691ec7f314f072d9dee8" UNIQUE ("orderNumber")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "customer_measurements" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar NOT NULL,
                "height" real,
                "shoulder" real,
                "chest" real,
                "waist" real,
                "sleeve" real,
                "pantsLength" real,
                "notes" text,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "customerId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "customer_notes" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "content" text NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "customerId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "customers" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "fullName" varchar(160) NOT NULL,
                "phone" varchar NOT NULL DEFAULT (''),
                "secondPhone" text,
                "address" text,
                "email" text,
                "city" text,
                "wilaya" text,
                "type" varchar CHECK(
                    "type" IN ('زبون دائم', 'زبون جديد', 'زبون مهم', 'زبون عرضي')
                ) NOT NULL DEFAULT ('زبون دائم'),
                "status" varchar CHECK("status" IN ('نشط', 'غير نشط', 'مؤرشف')) NOT NULL DEFAULT ('نشط'),
                "firstVisitDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "lastVisitDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "totalPurchases" real NOT NULL DEFAULT (0),
                "totalPaid" real NOT NULL DEFAULT (0),
                "totalDebt" real NOT NULL DEFAULT (0),
                "notes" text,
                "archivedAt" datetime,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "legacy_debt_payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "amountMinor" integer NOT NULL,
                "paymentDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ) NOT NULL DEFAULT ('نقداً'),
                "reference" text,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "legacyDebtId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "legacy_debts" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar CHECK(
                    "type" IN ('CUSTOMER_RECEIVABLE', 'SUPPLIER_PAYABLE')
                ) NOT NULL,
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
                "status" varchar CHECK(
                    "status" IN ('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')
                ) NOT NULL DEFAULT ('OPEN'),
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer,
                "supplierId" integer,
                CONSTRAINT "CHK_legacy_debt_owner" CHECK (
                    (
                        "type" = 'CUSTOMER_RECEIVABLE'
                        AND "customerId" IS NOT NULL
                        AND "supplierId" IS NULL
                    )
                    OR (
                        "type" = 'SUPPLIER_PAYABLE'
                        AND "supplierId" IS NOT NULL
                        AND "customerId" IS NULL
                    )
                )
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "customer_credit_transactions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar CHECK(
                    "type" IN (
                        'OVERPAYMENT',
                        'MANUAL_ADVANCE',
                        'SALE_USAGE',
                        'LEGACY_DEBT_USAGE',
                        'REFUND',
                        'ADJUSTMENT',
                        'REVERSAL'
                    )
                ) NOT NULL,
                "direction" varchar CHECK("direction" IN ('CREDIT', 'DEBIT')) NOT NULL,
                "amount" real NOT NULL,
                "amountMinor" integer NOT NULL,
                "transactionDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ),
                "balanceAfter" real NOT NULL DEFAULT (0),
                "balanceAfterMinor" integer NOT NULL DEFAULT (0),
                "reference" text,
                "notes" text,
                "reversedAt" datetime,
                "reversalReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer NOT NULL,
                "invoiceId" integer,
                "paymentId" integer,
                "legacyDebtId" integer,
                "legacyDebtPaymentId" integer,
                "reversalOfId" integer
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_customer_credit_customer_date" ON "customer_credit_transactions" ("customerId", "transactionDate")
        `);
    await queryRunner.query(`
            CREATE TABLE "expenses" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "category" varchar CHECK(
                    "category" IN (
                        'Achat matière',
                        'Salaires',
                        'Loyer',
                        'Électricité',
                        'Eau',
                        'Gaz',
                        'Internet / Téléphone',
                        'Maintenance',
                        'Réparation',
                        'Transport',
                        'Carburant',
                        'Fournitures',
                        'Nettoyage',
                        'Autre',
                        'Achat tissu',
                        'Fils et accessoires',
                        'Charges utilitaires',
                        'Maintenance machines'
                    )
                ) NOT NULL,
                "type" varchar CHECK("type" IN ('Fixe', 'Variable', 'Récurrent')) NOT NULL,
                "amount" real NOT NULL,
                "paidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "status" varchar CHECK(
                    "status" IN (
                        'PAID',
                        'PARTIALLY_PAID',
                        'UNPAID',
                        'UPCOMING',
                        'OVERDUE',
                        'CANCELLED'
                    )
                ) NOT NULL DEFAULT ('PAID'),
                "sourceType" varchar CHECK(
                    "sourceType" IN (
                        'MANUAL',
                        'RECURRING',
                        'SUPPLIER_PURCHASE',
                        'PAYROLL',
                        'SUPPLIER_LEGACY_PAYMENT'
                    )
                ) NOT NULL DEFAULT ('MANUAL'),
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ) NOT NULL,
                "date" date NOT NULL,
                "supplier" text,
                "linkedTo" text,
                "isRecurring" boolean NOT NULL DEFAULT (0),
                "frequency" varchar CHECK(
                    "frequency" IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')
                ),
                "nextDueDate" date,
                "startDate" date,
                "endDate" date,
                "notes" text,
                "archivedAt" datetime,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "document_sequences" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "documentType" varchar(24) NOT NULL,
                "year" integer NOT NULL,
                "nextValue" integer NOT NULL DEFAULT (1),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_document_sequence_type_year" UNIQUE ("documentType", "year")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "payroll_advance_deductions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "payrollId" integer NOT NULL,
                "advanceId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "payroll_loan_deductions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "payrollId" integer NOT NULL,
                "loanId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "salary_payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "date" date NOT NULL,
                "method" varchar CHECK("method" IN ('CASH', 'TRANSFER', 'OTHER')) NOT NULL,
                "reference" varchar,
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "payrollId" integer NOT NULL,
                "workerId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "payrolls" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "periodStart" date NOT NULL,
                "periodEnd" date NOT NULL,
                "salaryMonth" varchar,
                "salaryTypeSnapshot" varchar CHECK("salaryTypeSnapshot" IN ('شهري', 'حسب القطعة')) NOT NULL,
                "monthlySalarySnapshot" real NOT NULL DEFAULT (0),
                "installmentsInMonth" integer NOT NULL DEFAULT (0),
                "installmentNumber" integer NOT NULL DEFAULT (0),
                "piecesCompleted" integer NOT NULL DEFAULT (0),
                "piecePrice" real NOT NULL DEFAULT (0),
                "grossAmount" real NOT NULL DEFAULT (0),
                "advanceDeduction" real NOT NULL DEFAULT (0),
                "loanDeduction" real NOT NULL DEFAULT (0),
                "otherDeductions" real NOT NULL DEFAULT (0),
                "amountDue" real NOT NULL DEFAULT (0),
                "paidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "status" varchar CHECK(
                    "status" IN (
                        'DRAFT',
                        'CALCULATED',
                        'PARTIALLY_PAID',
                        'PAID',
                        'CANCELLED'
                    )
                ) NOT NULL,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d4009efc3234b473cddf638746" ON "payrolls" ("workerId", "periodStart", "periodEnd")
        `);
    await queryRunner.query(`
            CREATE TABLE "loan_repayments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "date" date NOT NULL,
                "method" varchar CHECK("method" IN ('CASH', 'TRANSFER', 'OTHER')) NOT NULL,
                "reference" varchar,
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "loanId" integer NOT NULL,
                "payrollId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "worker_loans" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "initialAmount" real NOT NULL,
                "repaidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL,
                "date" date NOT NULL,
                "status" varchar CHECK(
                    "status" IN ('OPEN', 'PARTIALLY_REPAID', 'REPAID')
                ) NOT NULL DEFAULT ('OPEN'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "attendances" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "date" date NOT NULL,
                "status" varchar CHECK("status" IN ('حاضر', 'غائب', 'متأخر')) NOT NULL,
                "checkIn" text,
                "checkOut" text,
                "lateMinutes" integer NOT NULL DEFAULT (0),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_1e73828d2e62af9c885b53ae63" ON "attendances" ("workerId", "date")
        `);
    await queryRunner.query(`
            CREATE TABLE "worker_productions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "date" date NOT NULL,
                "taskType" varchar CHECK("taskType" IN ('قطع', 'خياطة', 'كي', 'تغليف')) NOT NULL,
                "piecesCompleted" integer NOT NULL DEFAULT (0),
                "piecePrice" real NOT NULL DEFAULT (0),
                "totalAmount" real NOT NULL DEFAULT (0),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workers" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "fullName" varchar NOT NULL,
                "phone" text,
                "role" text NOT NULL,
                "salaryType" varchar CHECK("salaryType" IN ('شهري', 'حسب القطعة')) NOT NULL,
                "monthlySalary" real NOT NULL DEFAULT (0),
                "startDate" date NOT NULL,
                "status" varchar CHECK(
                    "status" IN ('نشط', 'في عطلة', 'غير نشط', 'مؤرشف')
                ) NOT NULL DEFAULT ('نشط'),
                "notes" text,
                "archivedAt" datetime,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "advances" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "deductedAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL,
                "date" date NOT NULL,
                "type" varchar CHECK("type" IN ('SALARY_ADVANCE', 'OTHER')) NOT NULL DEFAULT ('SALARY_ADVANCE'),
                "status" varchar CHECK(
                    "status" IN ('OPEN', 'PARTIALLY_SETTLED', 'SETTLED')
                ) NOT NULL DEFAULT ('OPEN'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "production_stages" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "orderIndex" integer NOT NULL,
                "color" varchar,
                "isActive" boolean NOT NULL DEFAULT (1),
                "description" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "settings" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "key" varchar NOT NULL,
                "value" text NOT NULL,
                "group" varchar NOT NULL,
                "description" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_c8639b7626fa94ba8265628f214" UNIQUE ("key")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "piece_prices" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "productType" varchar NOT NULL,
                "taskType" varchar NOT NULL,
                "workerRole" varchar CHECK(
                    "workerRole" IN (
                        'خياط',
                        'مساعد',
                        'قاطع قماش',
                        'مسؤول كي',
                        'مسؤول تغليف',
                        'بائع',
                        'مشرف'
                    )
                ) NOT NULL,
                "price" real NOT NULL,
                "isActive" boolean NOT NULL DEFAULT (1),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workshop_settings" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "workshopName" varchar(180) NOT NULL DEFAULT (''),
                "commercialName" text,
                "address" text,
                "phone" text,
                "email" text,
                "taxNumber" text,
                "commercialRegister" text,
                "logoPath" text,
                "stampPath" text,
                "defaultCurrency" varchar(3) NOT NULL DEFAULT ('DZD'),
                "defaultTaxEnabled" boolean NOT NULL DEFAULT (0),
                "defaultTaxRate" real NOT NULL DEFAULT (0),
                "invoiceFooter" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "worker_role_options" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" text NOT NULL,
                "normalizedName" text NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2510e3fce501b82c073c4d6353" ON "worker_role_options" ("normalizedName")
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_product_variants" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "sku" varchar(100) NOT NULL,
                "size" text,
                "color" text,
                "quantityProduced" integer NOT NULL DEFAULT (0),
                "quantityAvailable" integer NOT NULL DEFAULT (0),
                "quantitySold" integer NOT NULL DEFAULT (0),
                "salePrice" real,
                "active" boolean NOT NULL DEFAULT (1),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productId" integer,
                CONSTRAINT "UQ_46f236f21640f9da218a063a866" UNIQUE ("sku"),
                CONSTRAINT "FK_f515690c571a03400a9876600b5" FOREIGN KEY ("productId") REFERENCES "finished_products" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_product_variants"(
                    "id",
                    "sku",
                    "size",
                    "color",
                    "quantityProduced",
                    "quantityAvailable",
                    "quantitySold",
                    "salePrice",
                    "active",
                    "createdAt",
                    "updatedAt",
                    "productId"
                )
            SELECT "id",
                "sku",
                "size",
                "color",
                "quantityProduced",
                "quantityAvailable",
                "quantitySold",
                "salePrice",
                "active",
                "createdAt",
                "updatedAt",
                "productId"
            FROM "product_variants"
        `);
    await queryRunner.query(`
            DROP TABLE "product_variants"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_product_variants"
                RENAME TO "product_variants"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_product_stock_movements" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar CHECK(
                    "type" IN ('إنتاج', 'بيع', 'تعديل', 'إرجاع', 'تلف')
                ) NOT NULL,
                "quantity" integer NOT NULL,
                "previousQuantity" integer NOT NULL,
                "newQuantity" integer NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "reference" text,
                "reason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productId" integer,
                "variantId" integer,
                CONSTRAINT "FK_7315ef2834fae18caaf48545dc7" FOREIGN KEY ("productId") REFERENCES "finished_products" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_428e2556f4538365f280cd7cbf2" FOREIGN KEY ("variantId") REFERENCES "product_variants" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_product_stock_movements"(
                    "id",
                    "type",
                    "quantity",
                    "previousQuantity",
                    "newQuantity",
                    "date",
                    "reference",
                    "reason",
                    "createdAt",
                    "productId",
                    "variantId"
                )
            SELECT "id",
                "type",
                "quantity",
                "previousQuantity",
                "newQuantity",
                "date",
                "reference",
                "reason",
                "createdAt",
                "productId",
                "variantId"
            FROM "product_stock_movements"
        `);
    await queryRunner.query(`
            DROP TABLE "product_stock_movements"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_product_stock_movements"
                RENAME TO "product_stock_movements"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_production_materials" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "materialName" varchar NOT NULL,
                "unit" varchar NOT NULL,
                "quantityUsed" real NOT NULL,
                "unitCost" real NOT NULL DEFAULT (0),
                "totalCost" real NOT NULL DEFAULT (0),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productionBatchId" integer,
                "inventoryItemId" integer,
                CONSTRAINT "FK_605c0a68c10fe90ed3058da4ed5" FOREIGN KEY ("productionBatchId") REFERENCES "production_batches" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_4997a732a30c78d0d56f157bd18" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_production_materials"(
                    "id",
                    "materialName",
                    "unit",
                    "quantityUsed",
                    "unitCost",
                    "totalCost",
                    "createdAt",
                    "productionBatchId",
                    "inventoryItemId"
                )
            SELECT "id",
                "materialName",
                "unit",
                "quantityUsed",
                "unitCost",
                "totalCost",
                "createdAt",
                "productionBatchId",
                "inventoryItemId"
            FROM "production_materials"
        `);
    await queryRunner.query(`
            DROP TABLE "production_materials"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_production_materials"
                RENAME TO "production_materials"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_production_batches" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "batchNumber" varchar(80) NOT NULL,
                "quantityProduced" integer NOT NULL,
                "materialCost" real NOT NULL DEFAULT (0),
                "additionalCost" real NOT NULL DEFAULT (0),
                "totalCost" real NOT NULL DEFAULT (0),
                "unitCost" real NOT NULL DEFAULT (0),
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productId" integer,
                "variantId" integer,
                CONSTRAINT "UQ_3dc31412605975315d506df806d" UNIQUE ("batchNumber"),
                CONSTRAINT "FK_b25476d79420594679758ea43b6" FOREIGN KEY ("productId") REFERENCES "finished_products" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_cea0c28c5502c26fcbdbb89a263" FOREIGN KEY ("variantId") REFERENCES "product_variants" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_production_batches"(
                    "id",
                    "batchNumber",
                    "quantityProduced",
                    "materialCost",
                    "additionalCost",
                    "totalCost",
                    "unitCost",
                    "date",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "productId",
                    "variantId"
                )
            SELECT "id",
                "batchNumber",
                "quantityProduced",
                "materialCost",
                "additionalCost",
                "totalCost",
                "unitCost",
                "date",
                "notes",
                "createdAt",
                "updatedAt",
                "productId",
                "variantId"
            FROM "production_batches"
        `);
    await queryRunner.query(`
            DROP TABLE "production_batches"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_production_batches"
                RENAME TO "production_batches"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_material_consumptions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "quantityUsed" real NOT NULL,
                "date" date NOT NULL,
                "orderId" text,
                "cost" real NOT NULL DEFAULT (0),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "inventoryItemId" integer,
                "productionBatchId" integer,
                CONSTRAINT "FK_96489ce12dd2337595dea7197c7" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_1473b3d21102f8ca9ffdbaf747f" FOREIGN KEY ("productionBatchId") REFERENCES "production_batches" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_material_consumptions"(
                    "id",
                    "quantityUsed",
                    "date",
                    "orderId",
                    "cost",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "inventoryItemId",
                    "productionBatchId"
                )
            SELECT "id",
                "quantityUsed",
                "date",
                "orderId",
                "cost",
                "notes",
                "createdAt",
                "updatedAt",
                "inventoryItemId",
                "productionBatchId"
            FROM "material_consumptions"
        `);
    await queryRunner.query(`
            DROP TABLE "material_consumptions"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_material_consumptions"
                RENAME TO "material_consumptions"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_stock_movements" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "movementType" varchar CHECK(
                    "movementType" IN (
                        'دخول مخزون',
                        'خروج مخزون',
                        'تعديل كمية',
                        'تلف / ضياع',
                        'استهلاك للإنتاج'
                    )
                ) NOT NULL,
                "quantity" real NOT NULL,
                "previousQuantity" real NOT NULL DEFAULT (0),
                "newQuantity" real NOT NULL DEFAULT (0),
                "unit" text,
                "reason" text,
                "linkedOrderId" text,
                "date" date NOT NULL,
                "notes" text,
                "performedBy" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "inventoryItemId" integer,
                CONSTRAINT "FK_769feb209282a3f34e42d89f1dd" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_stock_movements"(
                    "id",
                    "movementType",
                    "quantity",
                    "previousQuantity",
                    "newQuantity",
                    "unit",
                    "reason",
                    "linkedOrderId",
                    "date",
                    "notes",
                    "performedBy",
                    "createdAt",
                    "updatedAt",
                    "inventoryItemId"
                )
            SELECT "id",
                "movementType",
                "quantity",
                "previousQuantity",
                "newQuantity",
                "unit",
                "reason",
                "linkedOrderId",
                "date",
                "notes",
                "performedBy",
                "createdAt",
                "updatedAt",
                "inventoryItemId"
            FROM "stock_movements"
        `);
    await queryRunner.query(`
            DROP TABLE "stock_movements"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_stock_movements"
                RENAME TO "stock_movements"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_supplier_payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ) NOT NULL DEFAULT ('نقداً'),
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "reference" text,
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierId" integer,
                "purchaseId" integer,
                CONSTRAINT "FK_a9606c250851fd546b0669925a4" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_f602728dc8c5931e6ae8697e6dd" FOREIGN KEY ("purchaseId") REFERENCES "supplier_purchases" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_supplier_payments"(
                    "id",
                    "amount",
                    "paymentMethod",
                    "date",
                    "reference",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "supplierId",
                    "purchaseId"
                )
            SELECT "id",
                "amount",
                "paymentMethod",
                "date",
                "reference",
                "notes",
                "createdAt",
                "updatedAt",
                "supplierId",
                "purchaseId"
            FROM "supplier_payments"
        `);
    await queryRunner.query(`
            DROP TABLE "supplier_payments"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_supplier_payments"
                RENAME TO "supplier_payments"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_supplier_purchases" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "materialName" varchar NOT NULL,
                "materialColor" text,
                "quantityPurchased" real NOT NULL,
                "unit" varchar NOT NULL,
                "totalAmount" real NOT NULL,
                "paidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "paymentStatus" varchar CHECK(
                    "paymentStatus" IN ('مدفوع', 'مدفوع جزئياً', 'غير مدفوع')
                ) NOT NULL DEFAULT ('غير مدفوع'),
                "purchaseDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierId" integer,
                "inventoryItemId" integer,
                CONSTRAINT "FK_73e9a7bad7efb832b88161b6585" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_573ae586c6c090336f3cae61750" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_supplier_purchases"(
                    "id",
                    "materialName",
                    "materialColor",
                    "quantityPurchased",
                    "unit",
                    "totalAmount",
                    "paidAmount",
                    "remainingAmount",
                    "paymentStatus",
                    "purchaseDate",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "supplierId",
                    "inventoryItemId"
                )
            SELECT "id",
                "materialName",
                "materialColor",
                "quantityPurchased",
                "unit",
                "totalAmount",
                "paidAmount",
                "remainingAmount",
                "paymentStatus",
                "purchaseDate",
                "notes",
                "createdAt",
                "updatedAt",
                "supplierId",
                "inventoryItemId"
            FROM "supplier_purchases"
        `);
    await queryRunner.query(`
            DROP TABLE "supplier_purchases"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_supplier_purchases"
                RENAME TO "supplier_purchases"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_inventory_items" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "reference" text,
                "category" varchar CHECK(
                    "category" IN (
                        'أقمشة',
                        'خيوط',
                        'أزرار',
                        'سحابات',
                        'إكسسوارات',
                        'تغليف',
                        'أدوات'
                    )
                ) NOT NULL,
                "type" text,
                "color" text,
                "quantity" real NOT NULL DEFAULT (0),
                "unit" varchar NOT NULL,
                "unitPrice" real NOT NULL DEFAULT (0),
                "supplier" text,
                "minStockAlert" real NOT NULL DEFAULT (0),
                "location" text,
                "status" varchar CHECK("status" IN ('متوفر', 'قارب على النفاد', 'نفد')) NOT NULL DEFAULT ('متوفر'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierEntityId" integer,
                CONSTRAINT "UQ_452583a3976cadc318d8b1f8993" UNIQUE ("reference"),
                CONSTRAINT "FK_0be1434e8e6497b5dd33cd1ea2d" FOREIGN KEY ("supplierEntityId") REFERENCES "suppliers" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_inventory_items"(
                    "id",
                    "name",
                    "reference",
                    "category",
                    "type",
                    "color",
                    "quantity",
                    "unit",
                    "unitPrice",
                    "supplier",
                    "minStockAlert",
                    "location",
                    "status",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "supplierEntityId"
                )
            SELECT "id",
                "name",
                "reference",
                "category",
                "type",
                "color",
                "quantity",
                "unit",
                "unitPrice",
                "supplier",
                "minStockAlert",
                "location",
                "status",
                "notes",
                "createdAt",
                "updatedAt",
                "supplierEntityId"
            FROM "inventory_items"
        `);
    await queryRunner.query(`
            DROP TABLE "inventory_items"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_inventory_items"
                RENAME TO "inventory_items"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_supplier_advances" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "appliedAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "debtBefore" real,
                "debtAfter" real,
                "status" varchar CHECK("status" IN ('مفتوحة', 'مستعملة', 'مغلقة')) NOT NULL DEFAULT ('مفتوحة'),
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierId" integer,
                CONSTRAINT "FK_57261472fdfca6a0b8b3082ec7d" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_supplier_advances"(
                    "id",
                    "amount",
                    "appliedAmount",
                    "remainingAmount",
                    "debtBefore",
                    "debtAfter",
                    "status",
                    "date",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "supplierId"
                )
            SELECT "id",
                "amount",
                "appliedAmount",
                "remainingAmount",
                "debtBefore",
                "debtAfter",
                "status",
                "date",
                "notes",
                "createdAt",
                "updatedAt",
                "supplierId"
            FROM "supplier_advances"
        `);
    await queryRunner.query(`
            DROP TABLE "supplier_advances"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_supplier_advances"
                RENAME TO "supplier_advances"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_invoice_items" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "description" varchar NOT NULL,
                "productName" text,
                "productType" varchar,
                "productSku" text,
                "reference" text,
                "variantLabel" text,
                "variantSnapshot" text,
                "size" text,
                "color" text,
                "quantity" integer NOT NULL DEFAULT (1),
                "unitPrice" real NOT NULL DEFAULT (0),
                "total" real NOT NULL DEFAULT (0),
                "unitPriceMinor" integer NOT NULL DEFAULT (0),
                "totalMinor" integer NOT NULL DEFAULT (0),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "invoiceId" integer,
                "productId" integer,
                "variantId" integer,
                CONSTRAINT "FK_7fb6895fc8fad9f5200e91abb59" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_7bec360ed9928668b73dac2ec17" FOREIGN KEY ("productId") REFERENCES "finished_products" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_77c947da09dfa2a76f3d0dfdaee" FOREIGN KEY ("variantId") REFERENCES "product_variants" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_invoice_items"(
                    "id",
                    "description",
                    "productName",
                    "productType",
                    "productSku",
                    "reference",
                    "variantLabel",
                    "variantSnapshot",
                    "size",
                    "color",
                    "quantity",
                    "unitPrice",
                    "total",
                    "unitPriceMinor",
                    "totalMinor",
                    "createdAt",
                    "invoiceId",
                    "productId",
                    "variantId"
                )
            SELECT "id",
                "description",
                "productName",
                "productType",
                "productSku",
                "reference",
                "variantLabel",
                "variantSnapshot",
                "size",
                "color",
                "quantity",
                "unitPrice",
                "total",
                "unitPriceMinor",
                "totalMinor",
                "createdAt",
                "invoiceId",
                "productId",
                "variantId"
            FROM "invoice_items"
        `);
    await queryRunner.query(`
            DROP TABLE "invoice_items"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_invoice_items"
                RENAME TO "invoice_items"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "amountMinor" integer NOT NULL DEFAULT (0),
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ) NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "reference" text,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer,
                "invoiceId" integer,
                CONSTRAINT "FK_824be6feda5e655c49c4e0c534b" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_43d19956aeab008b49e0804c145" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_payments"(
                    "id",
                    "amount",
                    "amountMinor",
                    "paymentMethod",
                    "date",
                    "reference",
                    "notes",
                    "cancelledAt",
                    "cancellationReason",
                    "createdAt",
                    "updatedAt",
                    "customerId",
                    "invoiceId"
                )
            SELECT "id",
                "amount",
                "amountMinor",
                "paymentMethod",
                "date",
                "reference",
                "notes",
                "cancelledAt",
                "cancellationReason",
                "createdAt",
                "updatedAt",
                "customerId",
                "invoiceId"
            FROM "payments"
        `);
    await queryRunner.query(`
            DROP TABLE "payments"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_payments"
                RENAME TO "payments"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_invoices" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "invoiceNumber" varchar NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "dueDate" date,
                "subtotal" real NOT NULL DEFAULT (0),
                "discount" real NOT NULL DEFAULT (0),
                "discountType" varchar CHECK(
                    "discountType" IN ('NONE', 'FIXED', 'PERCENTAGE')
                ) NOT NULL DEFAULT ('NONE'),
                "discountValue" real NOT NULL DEFAULT (0),
                "discountAmount" real NOT NULL DEFAULT (0),
                "taxEnabled" boolean NOT NULL DEFAULT (0),
                "taxRate" real NOT NULL DEFAULT (0),
                "taxAmount" real NOT NULL DEFAULT (0),
                "totalAmount" real NOT NULL DEFAULT (0),
                "paidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "paymentStatus" varchar CHECK(
                    "paymentStatus" IN ('مدفوعة', 'مدفوعة جزئياً', 'غير مدفوعة')
                ) NOT NULL DEFAULT ('غير مدفوعة'),
                "invoiceStatus" varchar CHECK(
                    "invoiceStatus" IN ('DRAFT', 'ISSUED', 'CANCELLED')
                ) NOT NULL DEFAULT ('ISSUED'),
                "currency" varchar(3) NOT NULL DEFAULT ('DZD'),
                "subtotalMinor" integer NOT NULL DEFAULT (0),
                "discountAmountMinor" integer NOT NULL DEFAULT (0),
                "taxAmountMinor" integer NOT NULL DEFAULT (0),
                "totalAmountMinor" integer NOT NULL DEFAULT (0),
                "paidAmountMinor" integer NOT NULL DEFAULT (0),
                "remainingAmountMinor" integer NOT NULL DEFAULT (0),
                "customerSnapshot" text,
                "workshopSnapshot" text,
                "orderNumberSnapshot" text,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer NOT NULL,
                "orderId" integer,
                CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber"),
                CONSTRAINT "REL_a58a78a0e0031dd93a2f56f1e8" UNIQUE ("orderId"),
                CONSTRAINT "FK_1df049f8943c6be0c1115541efb" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_a58a78a0e0031dd93a2f56f1e8e" FOREIGN KEY ("orderId") REFERENCES "sales_orders" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_invoices"(
                    "id",
                    "invoiceNumber",
                    "date",
                    "dueDate",
                    "subtotal",
                    "discount",
                    "discountType",
                    "discountValue",
                    "discountAmount",
                    "taxEnabled",
                    "taxRate",
                    "taxAmount",
                    "totalAmount",
                    "paidAmount",
                    "remainingAmount",
                    "paymentStatus",
                    "invoiceStatus",
                    "currency",
                    "subtotalMinor",
                    "discountAmountMinor",
                    "taxAmountMinor",
                    "totalAmountMinor",
                    "paidAmountMinor",
                    "remainingAmountMinor",
                    "customerSnapshot",
                    "workshopSnapshot",
                    "orderNumberSnapshot",
                    "notes",
                    "cancelledAt",
                    "cancellationReason",
                    "createdAt",
                    "updatedAt",
                    "customerId",
                    "orderId"
                )
            SELECT "id",
                "invoiceNumber",
                "date",
                "dueDate",
                "subtotal",
                "discount",
                "discountType",
                "discountValue",
                "discountAmount",
                "taxEnabled",
                "taxRate",
                "taxAmount",
                "totalAmount",
                "paidAmount",
                "remainingAmount",
                "paymentStatus",
                "invoiceStatus",
                "currency",
                "subtotalMinor",
                "discountAmountMinor",
                "taxAmountMinor",
                "totalAmountMinor",
                "paidAmountMinor",
                "remainingAmountMinor",
                "customerSnapshot",
                "workshopSnapshot",
                "orderNumberSnapshot",
                "notes",
                "cancelledAt",
                "cancellationReason",
                "createdAt",
                "updatedAt",
                "customerId",
                "orderId"
            FROM "invoices"
        `);
    await queryRunner.query(`
            DROP TABLE "invoices"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_invoices"
                RENAME TO "invoices"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_sales_order_items" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "productName" varchar(180) NOT NULL,
                "description" text,
                "reference" text,
                "variantSnapshot" text,
                "size" text,
                "color" text,
                "quantity" integer NOT NULL,
                "unitPrice" real NOT NULL DEFAULT (0),
                "total" real NOT NULL DEFAULT (0),
                "unitPriceMinor" integer NOT NULL DEFAULT (0),
                "totalMinor" integer NOT NULL DEFAULT (0),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "orderId" integer NOT NULL,
                "productId" integer,
                "variantId" integer,
                CONSTRAINT "FK_c2319c87ba1d2fa15654ffb305c" FOREIGN KEY ("orderId") REFERENCES "sales_orders" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_95836cf122ca5a4eb2e40ea552c" FOREIGN KEY ("productId") REFERENCES "finished_products" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_ea41bf782e7f41bf199bcc1d828" FOREIGN KEY ("variantId") REFERENCES "product_variants" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_sales_order_items"(
                    "id",
                    "productName",
                    "description",
                    "reference",
                    "variantSnapshot",
                    "size",
                    "color",
                    "quantity",
                    "unitPrice",
                    "total",
                    "unitPriceMinor",
                    "totalMinor",
                    "createdAt",
                    "orderId",
                    "productId",
                    "variantId"
                )
            SELECT "id",
                "productName",
                "description",
                "reference",
                "variantSnapshot",
                "size",
                "color",
                "quantity",
                "unitPrice",
                "total",
                "unitPriceMinor",
                "totalMinor",
                "createdAt",
                "orderId",
                "productId",
                "variantId"
            FROM "sales_order_items"
        `);
    await queryRunner.query(`
            DROP TABLE "sales_order_items"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_sales_order_items"
                RENAME TO "sales_order_items"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_sales_orders" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "orderNumber" varchar(32) NOT NULL,
                "orderDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "dueDate" date,
                "status" varchar CHECK(
                    "status" IN ('DRAFT', 'CONFIRMED', 'INVOICED', 'CANCELLED')
                ) NOT NULL DEFAULT ('DRAFT'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer NOT NULL,
                CONSTRAINT "UQ_ea901f7691ec7f314f072d9dee8" UNIQUE ("orderNumber"),
                CONSTRAINT "FK_9978ca165b4c0f27571f3d1d924" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_sales_orders"(
                    "id",
                    "orderNumber",
                    "orderDate",
                    "dueDate",
                    "status",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "customerId"
                )
            SELECT "id",
                "orderNumber",
                "orderDate",
                "dueDate",
                "status",
                "notes",
                "createdAt",
                "updatedAt",
                "customerId"
            FROM "sales_orders"
        `);
    await queryRunner.query(`
            DROP TABLE "sales_orders"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_sales_orders"
                RENAME TO "sales_orders"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_customer_measurements" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar NOT NULL,
                "height" real,
                "shoulder" real,
                "chest" real,
                "waist" real,
                "sleeve" real,
                "pantsLength" real,
                "notes" text,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "customerId" integer,
                CONSTRAINT "FK_8f1a2e8ccadc2e0b0482456e2be" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_customer_measurements"(
                    "id",
                    "type",
                    "height",
                    "shoulder",
                    "chest",
                    "waist",
                    "sleeve",
                    "pantsLength",
                    "notes",
                    "date",
                    "customerId"
                )
            SELECT "id",
                "type",
                "height",
                "shoulder",
                "chest",
                "waist",
                "sleeve",
                "pantsLength",
                "notes",
                "date",
                "customerId"
            FROM "customer_measurements"
        `);
    await queryRunner.query(`
            DROP TABLE "customer_measurements"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_customer_measurements"
                RENAME TO "customer_measurements"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_customer_notes" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "content" text NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "customerId" integer,
                CONSTRAINT "FK_136ae1445ffdcbb1e0014349b23" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_customer_notes"("id", "content", "date", "customerId")
            SELECT "id",
                "content",
                "date",
                "customerId"
            FROM "customer_notes"
        `);
    await queryRunner.query(`
            DROP TABLE "customer_notes"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_customer_notes"
                RENAME TO "customer_notes"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_legacy_debt_payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "amountMinor" integer NOT NULL,
                "paymentDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ) NOT NULL DEFAULT ('نقداً'),
                "reference" text,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "legacyDebtId" integer NOT NULL,
                CONSTRAINT "FK_82f51e68155c9708c7434bf2219" FOREIGN KEY ("legacyDebtId") REFERENCES "legacy_debts" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_legacy_debt_payments"(
                    "id",
                    "amount",
                    "amountMinor",
                    "paymentDate",
                    "paymentMethod",
                    "reference",
                    "notes",
                    "cancelledAt",
                    "cancellationReason",
                    "createdAt",
                    "legacyDebtId"
                )
            SELECT "id",
                "amount",
                "amountMinor",
                "paymentDate",
                "paymentMethod",
                "reference",
                "notes",
                "cancelledAt",
                "cancellationReason",
                "createdAt",
                "legacyDebtId"
            FROM "legacy_debt_payments"
        `);
    await queryRunner.query(`
            DROP TABLE "legacy_debt_payments"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_legacy_debt_payments"
                RENAME TO "legacy_debt_payments"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_legacy_debts" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar CHECK(
                    "type" IN ('CUSTOMER_RECEIVABLE', 'SUPPLIER_PAYABLE')
                ) NOT NULL,
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
                "status" varchar CHECK(
                    "status" IN ('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')
                ) NOT NULL DEFAULT ('OPEN'),
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer,
                "supplierId" integer,
                CONSTRAINT "CHK_legacy_debt_owner" CHECK (
                    (
                        "type" = 'CUSTOMER_RECEIVABLE'
                        AND "customerId" IS NOT NULL
                        AND "supplierId" IS NULL
                    )
                    OR (
                        "type" = 'SUPPLIER_PAYABLE'
                        AND "supplierId" IS NOT NULL
                        AND "customerId" IS NULL
                    )
                ),
                CONSTRAINT "FK_8e0ce8ceff64837531edc7b8087" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_45a07b89ae0d83bfc0111a6d1ab" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_legacy_debts"(
                    "id",
                    "type",
                    "originalAmount",
                    "paidAmount",
                    "remainingAmount",
                    "originalAmountMinor",
                    "paidAmountMinor",
                    "remainingAmountMinor",
                    "debtDate",
                    "dateIsUnknown",
                    "description",
                    "quantity",
                    "unit",
                    "paperReference",
                    "notes",
                    "status",
                    "cancelledAt",
                    "cancellationReason",
                    "createdAt",
                    "updatedAt",
                    "customerId",
                    "supplierId"
                )
            SELECT "id",
                "type",
                "originalAmount",
                "paidAmount",
                "remainingAmount",
                "originalAmountMinor",
                "paidAmountMinor",
                "remainingAmountMinor",
                "debtDate",
                "dateIsUnknown",
                "description",
                "quantity",
                "unit",
                "paperReference",
                "notes",
                "status",
                "cancelledAt",
                "cancellationReason",
                "createdAt",
                "updatedAt",
                "customerId",
                "supplierId"
            FROM "legacy_debts"
        `);
    await queryRunner.query(`
            DROP TABLE "legacy_debts"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_legacy_debts"
                RENAME TO "legacy_debts"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_customer_credit_customer_date"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_customer_credit_transactions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar CHECK(
                    "type" IN (
                        'OVERPAYMENT',
                        'MANUAL_ADVANCE',
                        'SALE_USAGE',
                        'LEGACY_DEBT_USAGE',
                        'REFUND',
                        'ADJUSTMENT',
                        'REVERSAL'
                    )
                ) NOT NULL,
                "direction" varchar CHECK("direction" IN ('CREDIT', 'DEBIT')) NOT NULL,
                "amount" real NOT NULL,
                "amountMinor" integer NOT NULL,
                "transactionDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ),
                "balanceAfter" real NOT NULL DEFAULT (0),
                "balanceAfterMinor" integer NOT NULL DEFAULT (0),
                "reference" text,
                "notes" text,
                "reversedAt" datetime,
                "reversalReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer NOT NULL,
                "invoiceId" integer,
                "paymentId" integer,
                "legacyDebtId" integer,
                "legacyDebtPaymentId" integer,
                "reversalOfId" integer,
                CONSTRAINT "FK_a48467ca36313bc5a46ae254858" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_d9c78c3d90c8c4e9cb3f3d3d0c1" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_01254804e80decd8bc9ab87abc9" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_ed2e011213f57d5abe80129750e" FOREIGN KEY ("legacyDebtId") REFERENCES "legacy_debts" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_90ea18d4c0b88e6c322811b4fda" FOREIGN KEY ("legacyDebtPaymentId") REFERENCES "legacy_debt_payments" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_558ea8f46fbcf9978d47c69df22" FOREIGN KEY ("reversalOfId") REFERENCES "customer_credit_transactions" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_customer_credit_transactions"(
                    "id",
                    "type",
                    "direction",
                    "amount",
                    "amountMinor",
                    "transactionDate",
                    "paymentMethod",
                    "balanceAfter",
                    "balanceAfterMinor",
                    "reference",
                    "notes",
                    "reversedAt",
                    "reversalReason",
                    "createdAt",
                    "customerId",
                    "invoiceId",
                    "paymentId",
                    "legacyDebtId",
                    "legacyDebtPaymentId",
                    "reversalOfId"
                )
            SELECT "id",
                "type",
                "direction",
                "amount",
                "amountMinor",
                "transactionDate",
                "paymentMethod",
                "balanceAfter",
                "balanceAfterMinor",
                "reference",
                "notes",
                "reversedAt",
                "reversalReason",
                "createdAt",
                "customerId",
                "invoiceId",
                "paymentId",
                "legacyDebtId",
                "legacyDebtPaymentId",
                "reversalOfId"
            FROM "customer_credit_transactions"
        `);
    await queryRunner.query(`
            DROP TABLE "customer_credit_transactions"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_customer_credit_transactions"
                RENAME TO "customer_credit_transactions"
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_customer_credit_customer_date" ON "customer_credit_transactions" ("customerId", "transactionDate")
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_payroll_advance_deductions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "payrollId" integer NOT NULL,
                "advanceId" integer NOT NULL,
                CONSTRAINT "FK_a85e1ba77e26fb3ab1bfaa98817" FOREIGN KEY ("payrollId") REFERENCES "payrolls" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_8c06a2229cf67d243688bba37a1" FOREIGN KEY ("advanceId") REFERENCES "advances" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_payroll_advance_deductions"("id", "amount", "payrollId", "advanceId")
            SELECT "id",
                "amount",
                "payrollId",
                "advanceId"
            FROM "payroll_advance_deductions"
        `);
    await queryRunner.query(`
            DROP TABLE "payroll_advance_deductions"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_payroll_advance_deductions"
                RENAME TO "payroll_advance_deductions"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_payroll_loan_deductions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "payrollId" integer NOT NULL,
                "loanId" integer NOT NULL,
                CONSTRAINT "FK_4c2da3de08f5a045f80ddae9229" FOREIGN KEY ("payrollId") REFERENCES "payrolls" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_2cf324abfc26a19df30879c33dd" FOREIGN KEY ("loanId") REFERENCES "worker_loans" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_payroll_loan_deductions"("id", "amount", "payrollId", "loanId")
            SELECT "id",
                "amount",
                "payrollId",
                "loanId"
            FROM "payroll_loan_deductions"
        `);
    await queryRunner.query(`
            DROP TABLE "payroll_loan_deductions"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_payroll_loan_deductions"
                RENAME TO "payroll_loan_deductions"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_salary_payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "date" date NOT NULL,
                "method" varchar CHECK("method" IN ('CASH', 'TRANSFER', 'OTHER')) NOT NULL,
                "reference" varchar,
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "payrollId" integer NOT NULL,
                "workerId" integer NOT NULL,
                CONSTRAINT "FK_fd1b08a3d6c113d15425eca7531" FOREIGN KEY ("payrollId") REFERENCES "payrolls" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_8a6983c65cd2ff463bf4727f893" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_salary_payments"(
                    "id",
                    "amount",
                    "date",
                    "method",
                    "reference",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "payrollId",
                    "workerId"
                )
            SELECT "id",
                "amount",
                "date",
                "method",
                "reference",
                "notes",
                "createdAt",
                "updatedAt",
                "payrollId",
                "workerId"
            FROM "salary_payments"
        `);
    await queryRunner.query(`
            DROP TABLE "salary_payments"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_salary_payments"
                RENAME TO "salary_payments"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_d4009efc3234b473cddf638746"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_payrolls" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "periodStart" date NOT NULL,
                "periodEnd" date NOT NULL,
                "salaryMonth" varchar,
                "salaryTypeSnapshot" varchar CHECK("salaryTypeSnapshot" IN ('شهري', 'حسب القطعة')) NOT NULL,
                "monthlySalarySnapshot" real NOT NULL DEFAULT (0),
                "installmentsInMonth" integer NOT NULL DEFAULT (0),
                "installmentNumber" integer NOT NULL DEFAULT (0),
                "piecesCompleted" integer NOT NULL DEFAULT (0),
                "piecePrice" real NOT NULL DEFAULT (0),
                "grossAmount" real NOT NULL DEFAULT (0),
                "advanceDeduction" real NOT NULL DEFAULT (0),
                "loanDeduction" real NOT NULL DEFAULT (0),
                "otherDeductions" real NOT NULL DEFAULT (0),
                "amountDue" real NOT NULL DEFAULT (0),
                "paidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "status" varchar CHECK(
                    "status" IN (
                        'DRAFT',
                        'CALCULATED',
                        'PARTIALLY_PAID',
                        'PAID',
                        'CANCELLED'
                    )
                ) NOT NULL,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer NOT NULL,
                CONSTRAINT "FK_dda8da0545bce9baf1385e8c956" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_payrolls"(
                    "id",
                    "periodStart",
                    "periodEnd",
                    "salaryMonth",
                    "salaryTypeSnapshot",
                    "monthlySalarySnapshot",
                    "installmentsInMonth",
                    "installmentNumber",
                    "piecesCompleted",
                    "piecePrice",
                    "grossAmount",
                    "advanceDeduction",
                    "loanDeduction",
                    "otherDeductions",
                    "amountDue",
                    "paidAmount",
                    "remainingAmount",
                    "status",
                    "notes",
                    "cancelledAt",
                    "cancellationReason",
                    "createdAt",
                    "updatedAt",
                    "workerId"
                )
            SELECT "id",
                "periodStart",
                "periodEnd",
                "salaryMonth",
                "salaryTypeSnapshot",
                "monthlySalarySnapshot",
                "installmentsInMonth",
                "installmentNumber",
                "piecesCompleted",
                "piecePrice",
                "grossAmount",
                "advanceDeduction",
                "loanDeduction",
                "otherDeductions",
                "amountDue",
                "paidAmount",
                "remainingAmount",
                "status",
                "notes",
                "cancelledAt",
                "cancellationReason",
                "createdAt",
                "updatedAt",
                "workerId"
            FROM "payrolls"
        `);
    await queryRunner.query(`
            DROP TABLE "payrolls"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_payrolls"
                RENAME TO "payrolls"
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d4009efc3234b473cddf638746" ON "payrolls" ("workerId", "periodStart", "periodEnd")
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_loan_repayments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "date" date NOT NULL,
                "method" varchar CHECK("method" IN ('CASH', 'TRANSFER', 'OTHER')) NOT NULL,
                "reference" varchar,
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "loanId" integer NOT NULL,
                "payrollId" integer,
                CONSTRAINT "FK_a2f0da4f5cd58b196e6db2d58e3" FOREIGN KEY ("loanId") REFERENCES "worker_loans" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_ac41a6ecd8d9acf469c74d12b42" FOREIGN KEY ("payrollId") REFERENCES "payrolls" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_loan_repayments"(
                    "id",
                    "amount",
                    "date",
                    "method",
                    "reference",
                    "notes",
                    "createdAt",
                    "loanId",
                    "payrollId"
                )
            SELECT "id",
                "amount",
                "date",
                "method",
                "reference",
                "notes",
                "createdAt",
                "loanId",
                "payrollId"
            FROM "loan_repayments"
        `);
    await queryRunner.query(`
            DROP TABLE "loan_repayments"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_loan_repayments"
                RENAME TO "loan_repayments"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_worker_loans" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "initialAmount" real NOT NULL,
                "repaidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL,
                "date" date NOT NULL,
                "status" varchar CHECK(
                    "status" IN ('OPEN', 'PARTIALLY_REPAID', 'REPAID')
                ) NOT NULL DEFAULT ('OPEN'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer NOT NULL,
                CONSTRAINT "FK_60f6f15d5f0a4b7b08c86d700b6" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_worker_loans"(
                    "id",
                    "initialAmount",
                    "repaidAmount",
                    "remainingAmount",
                    "date",
                    "status",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "workerId"
                )
            SELECT "id",
                "initialAmount",
                "repaidAmount",
                "remainingAmount",
                "date",
                "status",
                "notes",
                "createdAt",
                "updatedAt",
                "workerId"
            FROM "worker_loans"
        `);
    await queryRunner.query(`
            DROP TABLE "worker_loans"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_worker_loans"
                RENAME TO "worker_loans"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_1e73828d2e62af9c885b53ae63"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_attendances" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "date" date NOT NULL,
                "status" varchar CHECK("status" IN ('حاضر', 'غائب', 'متأخر')) NOT NULL,
                "checkIn" text,
                "checkOut" text,
                "lateMinutes" integer NOT NULL DEFAULT (0),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer,
                CONSTRAINT "FK_f6375125d1a9957d485543eeb0a" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_attendances"(
                    "id",
                    "date",
                    "status",
                    "checkIn",
                    "checkOut",
                    "lateMinutes",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "workerId"
                )
            SELECT "id",
                "date",
                "status",
                "checkIn",
                "checkOut",
                "lateMinutes",
                "notes",
                "createdAt",
                "updatedAt",
                "workerId"
            FROM "attendances"
        `);
    await queryRunner.query(`
            DROP TABLE "attendances"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_attendances"
                RENAME TO "attendances"
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_1e73828d2e62af9c885b53ae63" ON "attendances" ("workerId", "date")
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_worker_productions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "date" date NOT NULL,
                "taskType" varchar CHECK("taskType" IN ('قطع', 'خياطة', 'كي', 'تغليف')) NOT NULL,
                "piecesCompleted" integer NOT NULL DEFAULT (0),
                "piecePrice" real NOT NULL DEFAULT (0),
                "totalAmount" real NOT NULL DEFAULT (0),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer,
                CONSTRAINT "FK_7501ab5eaedfda19aebc5a2c1e1" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_worker_productions"(
                    "id",
                    "date",
                    "taskType",
                    "piecesCompleted",
                    "piecePrice",
                    "totalAmount",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "workerId"
                )
            SELECT "id",
                "date",
                "taskType",
                "piecesCompleted",
                "piecePrice",
                "totalAmount",
                "notes",
                "createdAt",
                "updatedAt",
                "workerId"
            FROM "worker_productions"
        `);
    await queryRunner.query(`
            DROP TABLE "worker_productions"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_worker_productions"
                RENAME TO "worker_productions"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_advances" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "deductedAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL,
                "date" date NOT NULL,
                "type" varchar CHECK("type" IN ('SALARY_ADVANCE', 'OTHER')) NOT NULL DEFAULT ('SALARY_ADVANCE'),
                "status" varchar CHECK(
                    "status" IN ('OPEN', 'PARTIALLY_SETTLED', 'SETTLED')
                ) NOT NULL DEFAULT ('OPEN'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer NOT NULL,
                CONSTRAINT "FK_9b2a7819f2d9f4d0087be9bd74e" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_advances"(
                    "id",
                    "amount",
                    "deductedAmount",
                    "remainingAmount",
                    "date",
                    "type",
                    "status",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "workerId"
                )
            SELECT "id",
                "amount",
                "deductedAmount",
                "remainingAmount",
                "date",
                "type",
                "status",
                "notes",
                "createdAt",
                "updatedAt",
                "workerId"
            FROM "advances"
        `);
    await queryRunner.query(`
            DROP TABLE "advances"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_advances"
                RENAME TO "advances"
        `);
    await queryRunner.query(`PRAGMA user_version = ${INITIAL_SCHEMA_VERSION}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    throw new Error(
      'The initial Khayati schema baseline cannot be reverted because it protects historical business data.',
    );

    await queryRunner.query(`
            ALTER TABLE "advances"
                RENAME TO "temporary_advances"
        `);
    await queryRunner.query(`
            CREATE TABLE "advances" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "deductedAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL,
                "date" date NOT NULL,
                "type" varchar CHECK("type" IN ('SALARY_ADVANCE', 'OTHER')) NOT NULL DEFAULT ('SALARY_ADVANCE'),
                "status" varchar CHECK(
                    "status" IN ('OPEN', 'PARTIALLY_SETTLED', 'SETTLED')
                ) NOT NULL DEFAULT ('OPEN'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "advances"(
                    "id",
                    "amount",
                    "deductedAmount",
                    "remainingAmount",
                    "date",
                    "type",
                    "status",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "workerId"
                )
            SELECT "id",
                "amount",
                "deductedAmount",
                "remainingAmount",
                "date",
                "type",
                "status",
                "notes",
                "createdAt",
                "updatedAt",
                "workerId"
            FROM "temporary_advances"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_advances"
        `);
    await queryRunner.query(`
            ALTER TABLE "worker_productions"
                RENAME TO "temporary_worker_productions"
        `);
    await queryRunner.query(`
            CREATE TABLE "worker_productions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "date" date NOT NULL,
                "taskType" varchar CHECK("taskType" IN ('قطع', 'خياطة', 'كي', 'تغليف')) NOT NULL,
                "piecesCompleted" integer NOT NULL DEFAULT (0),
                "piecePrice" real NOT NULL DEFAULT (0),
                "totalAmount" real NOT NULL DEFAULT (0),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "worker_productions"(
                    "id",
                    "date",
                    "taskType",
                    "piecesCompleted",
                    "piecePrice",
                    "totalAmount",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "workerId"
                )
            SELECT "id",
                "date",
                "taskType",
                "piecesCompleted",
                "piecePrice",
                "totalAmount",
                "notes",
                "createdAt",
                "updatedAt",
                "workerId"
            FROM "temporary_worker_productions"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_worker_productions"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_1e73828d2e62af9c885b53ae63"
        `);
    await queryRunner.query(`
            ALTER TABLE "attendances"
                RENAME TO "temporary_attendances"
        `);
    await queryRunner.query(`
            CREATE TABLE "attendances" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "date" date NOT NULL,
                "status" varchar CHECK("status" IN ('حاضر', 'غائب', 'متأخر')) NOT NULL,
                "checkIn" text,
                "checkOut" text,
                "lateMinutes" integer NOT NULL DEFAULT (0),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "attendances"(
                    "id",
                    "date",
                    "status",
                    "checkIn",
                    "checkOut",
                    "lateMinutes",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "workerId"
                )
            SELECT "id",
                "date",
                "status",
                "checkIn",
                "checkOut",
                "lateMinutes",
                "notes",
                "createdAt",
                "updatedAt",
                "workerId"
            FROM "temporary_attendances"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_attendances"
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_1e73828d2e62af9c885b53ae63" ON "attendances" ("workerId", "date")
        `);
    await queryRunner.query(`
            ALTER TABLE "worker_loans"
                RENAME TO "temporary_worker_loans"
        `);
    await queryRunner.query(`
            CREATE TABLE "worker_loans" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "initialAmount" real NOT NULL,
                "repaidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL,
                "date" date NOT NULL,
                "status" varchar CHECK(
                    "status" IN ('OPEN', 'PARTIALLY_REPAID', 'REPAID')
                ) NOT NULL DEFAULT ('OPEN'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "worker_loans"(
                    "id",
                    "initialAmount",
                    "repaidAmount",
                    "remainingAmount",
                    "date",
                    "status",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "workerId"
                )
            SELECT "id",
                "initialAmount",
                "repaidAmount",
                "remainingAmount",
                "date",
                "status",
                "notes",
                "createdAt",
                "updatedAt",
                "workerId"
            FROM "temporary_worker_loans"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_worker_loans"
        `);
    await queryRunner.query(`
            ALTER TABLE "loan_repayments"
                RENAME TO "temporary_loan_repayments"
        `);
    await queryRunner.query(`
            CREATE TABLE "loan_repayments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "date" date NOT NULL,
                "method" varchar CHECK("method" IN ('CASH', 'TRANSFER', 'OTHER')) NOT NULL,
                "reference" varchar,
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "loanId" integer NOT NULL,
                "payrollId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "loan_repayments"(
                    "id",
                    "amount",
                    "date",
                    "method",
                    "reference",
                    "notes",
                    "createdAt",
                    "loanId",
                    "payrollId"
                )
            SELECT "id",
                "amount",
                "date",
                "method",
                "reference",
                "notes",
                "createdAt",
                "loanId",
                "payrollId"
            FROM "temporary_loan_repayments"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_loan_repayments"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_d4009efc3234b473cddf638746"
        `);
    await queryRunner.query(`
            ALTER TABLE "payrolls"
                RENAME TO "temporary_payrolls"
        `);
    await queryRunner.query(`
            CREATE TABLE "payrolls" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "periodStart" date NOT NULL,
                "periodEnd" date NOT NULL,
                "salaryMonth" varchar,
                "salaryTypeSnapshot" varchar CHECK("salaryTypeSnapshot" IN ('شهري', 'حسب القطعة')) NOT NULL,
                "monthlySalarySnapshot" real NOT NULL DEFAULT (0),
                "installmentsInMonth" integer NOT NULL DEFAULT (0),
                "installmentNumber" integer NOT NULL DEFAULT (0),
                "piecesCompleted" integer NOT NULL DEFAULT (0),
                "piecePrice" real NOT NULL DEFAULT (0),
                "grossAmount" real NOT NULL DEFAULT (0),
                "advanceDeduction" real NOT NULL DEFAULT (0),
                "loanDeduction" real NOT NULL DEFAULT (0),
                "otherDeductions" real NOT NULL DEFAULT (0),
                "amountDue" real NOT NULL DEFAULT (0),
                "paidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "status" varchar CHECK(
                    "status" IN (
                        'DRAFT',
                        'CALCULATED',
                        'PARTIALLY_PAID',
                        'PAID',
                        'CANCELLED'
                    )
                ) NOT NULL,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "workerId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "payrolls"(
                    "id",
                    "periodStart",
                    "periodEnd",
                    "salaryMonth",
                    "salaryTypeSnapshot",
                    "monthlySalarySnapshot",
                    "installmentsInMonth",
                    "installmentNumber",
                    "piecesCompleted",
                    "piecePrice",
                    "grossAmount",
                    "advanceDeduction",
                    "loanDeduction",
                    "otherDeductions",
                    "amountDue",
                    "paidAmount",
                    "remainingAmount",
                    "status",
                    "notes",
                    "cancelledAt",
                    "cancellationReason",
                    "createdAt",
                    "updatedAt",
                    "workerId"
                )
            SELECT "id",
                "periodStart",
                "periodEnd",
                "salaryMonth",
                "salaryTypeSnapshot",
                "monthlySalarySnapshot",
                "installmentsInMonth",
                "installmentNumber",
                "piecesCompleted",
                "piecePrice",
                "grossAmount",
                "advanceDeduction",
                "loanDeduction",
                "otherDeductions",
                "amountDue",
                "paidAmount",
                "remainingAmount",
                "status",
                "notes",
                "cancelledAt",
                "cancellationReason",
                "createdAt",
                "updatedAt",
                "workerId"
            FROM "temporary_payrolls"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_payrolls"
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d4009efc3234b473cddf638746" ON "payrolls" ("workerId", "periodStart", "periodEnd")
        `);
    await queryRunner.query(`
            ALTER TABLE "salary_payments"
                RENAME TO "temporary_salary_payments"
        `);
    await queryRunner.query(`
            CREATE TABLE "salary_payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "date" date NOT NULL,
                "method" varchar CHECK("method" IN ('CASH', 'TRANSFER', 'OTHER')) NOT NULL,
                "reference" varchar,
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "payrollId" integer NOT NULL,
                "workerId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "salary_payments"(
                    "id",
                    "amount",
                    "date",
                    "method",
                    "reference",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "payrollId",
                    "workerId"
                )
            SELECT "id",
                "amount",
                "date",
                "method",
                "reference",
                "notes",
                "createdAt",
                "updatedAt",
                "payrollId",
                "workerId"
            FROM "temporary_salary_payments"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_salary_payments"
        `);
    await queryRunner.query(`
            ALTER TABLE "payroll_loan_deductions"
                RENAME TO "temporary_payroll_loan_deductions"
        `);
    await queryRunner.query(`
            CREATE TABLE "payroll_loan_deductions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "payrollId" integer NOT NULL,
                "loanId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "payroll_loan_deductions"("id", "amount", "payrollId", "loanId")
            SELECT "id",
                "amount",
                "payrollId",
                "loanId"
            FROM "temporary_payroll_loan_deductions"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_payroll_loan_deductions"
        `);
    await queryRunner.query(`
            ALTER TABLE "payroll_advance_deductions"
                RENAME TO "temporary_payroll_advance_deductions"
        `);
    await queryRunner.query(`
            CREATE TABLE "payroll_advance_deductions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "payrollId" integer NOT NULL,
                "advanceId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "payroll_advance_deductions"("id", "amount", "payrollId", "advanceId")
            SELECT "id",
                "amount",
                "payrollId",
                "advanceId"
            FROM "temporary_payroll_advance_deductions"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_payroll_advance_deductions"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_customer_credit_customer_date"
        `);
    await queryRunner.query(`
            ALTER TABLE "customer_credit_transactions"
                RENAME TO "temporary_customer_credit_transactions"
        `);
    await queryRunner.query(`
            CREATE TABLE "customer_credit_transactions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar CHECK(
                    "type" IN (
                        'OVERPAYMENT',
                        'MANUAL_ADVANCE',
                        'SALE_USAGE',
                        'LEGACY_DEBT_USAGE',
                        'REFUND',
                        'ADJUSTMENT',
                        'REVERSAL'
                    )
                ) NOT NULL,
                "direction" varchar CHECK("direction" IN ('CREDIT', 'DEBIT')) NOT NULL,
                "amount" real NOT NULL,
                "amountMinor" integer NOT NULL,
                "transactionDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ),
                "balanceAfter" real NOT NULL DEFAULT (0),
                "balanceAfterMinor" integer NOT NULL DEFAULT (0),
                "reference" text,
                "notes" text,
                "reversedAt" datetime,
                "reversalReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer NOT NULL,
                "invoiceId" integer,
                "paymentId" integer,
                "legacyDebtId" integer,
                "legacyDebtPaymentId" integer,
                "reversalOfId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "customer_credit_transactions"(
                    "id",
                    "type",
                    "direction",
                    "amount",
                    "amountMinor",
                    "transactionDate",
                    "paymentMethod",
                    "balanceAfter",
                    "balanceAfterMinor",
                    "reference",
                    "notes",
                    "reversedAt",
                    "reversalReason",
                    "createdAt",
                    "customerId",
                    "invoiceId",
                    "paymentId",
                    "legacyDebtId",
                    "legacyDebtPaymentId",
                    "reversalOfId"
                )
            SELECT "id",
                "type",
                "direction",
                "amount",
                "amountMinor",
                "transactionDate",
                "paymentMethod",
                "balanceAfter",
                "balanceAfterMinor",
                "reference",
                "notes",
                "reversedAt",
                "reversalReason",
                "createdAt",
                "customerId",
                "invoiceId",
                "paymentId",
                "legacyDebtId",
                "legacyDebtPaymentId",
                "reversalOfId"
            FROM "temporary_customer_credit_transactions"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_customer_credit_transactions"
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_customer_credit_customer_date" ON "customer_credit_transactions" ("customerId", "transactionDate")
        `);
    await queryRunner.query(`
            ALTER TABLE "legacy_debts"
                RENAME TO "temporary_legacy_debts"
        `);
    await queryRunner.query(`
            CREATE TABLE "legacy_debts" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar CHECK(
                    "type" IN ('CUSTOMER_RECEIVABLE', 'SUPPLIER_PAYABLE')
                ) NOT NULL,
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
                "status" varchar CHECK(
                    "status" IN ('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')
                ) NOT NULL DEFAULT ('OPEN'),
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer,
                "supplierId" integer,
                CONSTRAINT "CHK_legacy_debt_owner" CHECK (
                    (
                        "type" = 'CUSTOMER_RECEIVABLE'
                        AND "customerId" IS NOT NULL
                        AND "supplierId" IS NULL
                    )
                    OR (
                        "type" = 'SUPPLIER_PAYABLE'
                        AND "supplierId" IS NOT NULL
                        AND "customerId" IS NULL
                    )
                )
            )
        `);
    await queryRunner.query(`
            INSERT INTO "legacy_debts"(
                    "id",
                    "type",
                    "originalAmount",
                    "paidAmount",
                    "remainingAmount",
                    "originalAmountMinor",
                    "paidAmountMinor",
                    "remainingAmountMinor",
                    "debtDate",
                    "dateIsUnknown",
                    "description",
                    "quantity",
                    "unit",
                    "paperReference",
                    "notes",
                    "status",
                    "cancelledAt",
                    "cancellationReason",
                    "createdAt",
                    "updatedAt",
                    "customerId",
                    "supplierId"
                )
            SELECT "id",
                "type",
                "originalAmount",
                "paidAmount",
                "remainingAmount",
                "originalAmountMinor",
                "paidAmountMinor",
                "remainingAmountMinor",
                "debtDate",
                "dateIsUnknown",
                "description",
                "quantity",
                "unit",
                "paperReference",
                "notes",
                "status",
                "cancelledAt",
                "cancellationReason",
                "createdAt",
                "updatedAt",
                "customerId",
                "supplierId"
            FROM "temporary_legacy_debts"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_legacy_debts"
        `);
    await queryRunner.query(`
            ALTER TABLE "legacy_debt_payments"
                RENAME TO "temporary_legacy_debt_payments"
        `);
    await queryRunner.query(`
            CREATE TABLE "legacy_debt_payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "amountMinor" integer NOT NULL,
                "paymentDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ) NOT NULL DEFAULT ('نقداً'),
                "reference" text,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "legacyDebtId" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "legacy_debt_payments"(
                    "id",
                    "amount",
                    "amountMinor",
                    "paymentDate",
                    "paymentMethod",
                    "reference",
                    "notes",
                    "cancelledAt",
                    "cancellationReason",
                    "createdAt",
                    "legacyDebtId"
                )
            SELECT "id",
                "amount",
                "amountMinor",
                "paymentDate",
                "paymentMethod",
                "reference",
                "notes",
                "cancelledAt",
                "cancellationReason",
                "createdAt",
                "legacyDebtId"
            FROM "temporary_legacy_debt_payments"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_legacy_debt_payments"
        `);
    await queryRunner.query(`
            ALTER TABLE "customer_notes"
                RENAME TO "temporary_customer_notes"
        `);
    await queryRunner.query(`
            CREATE TABLE "customer_notes" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "content" text NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "customerId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "customer_notes"("id", "content", "date", "customerId")
            SELECT "id",
                "content",
                "date",
                "customerId"
            FROM "temporary_customer_notes"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_customer_notes"
        `);
    await queryRunner.query(`
            ALTER TABLE "customer_measurements"
                RENAME TO "temporary_customer_measurements"
        `);
    await queryRunner.query(`
            CREATE TABLE "customer_measurements" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar NOT NULL,
                "height" real,
                "shoulder" real,
                "chest" real,
                "waist" real,
                "sleeve" real,
                "pantsLength" real,
                "notes" text,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "customerId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "customer_measurements"(
                    "id",
                    "type",
                    "height",
                    "shoulder",
                    "chest",
                    "waist",
                    "sleeve",
                    "pantsLength",
                    "notes",
                    "date",
                    "customerId"
                )
            SELECT "id",
                "type",
                "height",
                "shoulder",
                "chest",
                "waist",
                "sleeve",
                "pantsLength",
                "notes",
                "date",
                "customerId"
            FROM "temporary_customer_measurements"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_customer_measurements"
        `);
    await queryRunner.query(`
            ALTER TABLE "sales_orders"
                RENAME TO "temporary_sales_orders"
        `);
    await queryRunner.query(`
            CREATE TABLE "sales_orders" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "orderNumber" varchar(32) NOT NULL,
                "orderDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "dueDate" date,
                "status" varchar CHECK(
                    "status" IN ('DRAFT', 'CONFIRMED', 'INVOICED', 'CANCELLED')
                ) NOT NULL DEFAULT ('DRAFT'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer NOT NULL,
                CONSTRAINT "UQ_ea901f7691ec7f314f072d9dee8" UNIQUE ("orderNumber")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "sales_orders"(
                    "id",
                    "orderNumber",
                    "orderDate",
                    "dueDate",
                    "status",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "customerId"
                )
            SELECT "id",
                "orderNumber",
                "orderDate",
                "dueDate",
                "status",
                "notes",
                "createdAt",
                "updatedAt",
                "customerId"
            FROM "temporary_sales_orders"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_sales_orders"
        `);
    await queryRunner.query(`
            ALTER TABLE "sales_order_items"
                RENAME TO "temporary_sales_order_items"
        `);
    await queryRunner.query(`
            CREATE TABLE "sales_order_items" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "productName" varchar(180) NOT NULL,
                "description" text,
                "reference" text,
                "variantSnapshot" text,
                "size" text,
                "color" text,
                "quantity" integer NOT NULL,
                "unitPrice" real NOT NULL DEFAULT (0),
                "total" real NOT NULL DEFAULT (0),
                "unitPriceMinor" integer NOT NULL DEFAULT (0),
                "totalMinor" integer NOT NULL DEFAULT (0),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "orderId" integer NOT NULL,
                "productId" integer,
                "variantId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "sales_order_items"(
                    "id",
                    "productName",
                    "description",
                    "reference",
                    "variantSnapshot",
                    "size",
                    "color",
                    "quantity",
                    "unitPrice",
                    "total",
                    "unitPriceMinor",
                    "totalMinor",
                    "createdAt",
                    "orderId",
                    "productId",
                    "variantId"
                )
            SELECT "id",
                "productName",
                "description",
                "reference",
                "variantSnapshot",
                "size",
                "color",
                "quantity",
                "unitPrice",
                "total",
                "unitPriceMinor",
                "totalMinor",
                "createdAt",
                "orderId",
                "productId",
                "variantId"
            FROM "temporary_sales_order_items"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_sales_order_items"
        `);
    await queryRunner.query(`
            ALTER TABLE "invoices"
                RENAME TO "temporary_invoices"
        `);
    await queryRunner.query(`
            CREATE TABLE "invoices" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "invoiceNumber" varchar NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "dueDate" date,
                "subtotal" real NOT NULL DEFAULT (0),
                "discount" real NOT NULL DEFAULT (0),
                "discountType" varchar CHECK(
                    "discountType" IN ('NONE', 'FIXED', 'PERCENTAGE')
                ) NOT NULL DEFAULT ('NONE'),
                "discountValue" real NOT NULL DEFAULT (0),
                "discountAmount" real NOT NULL DEFAULT (0),
                "taxEnabled" boolean NOT NULL DEFAULT (0),
                "taxRate" real NOT NULL DEFAULT (0),
                "taxAmount" real NOT NULL DEFAULT (0),
                "totalAmount" real NOT NULL DEFAULT (0),
                "paidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "paymentStatus" varchar CHECK(
                    "paymentStatus" IN ('مدفوعة', 'مدفوعة جزئياً', 'غير مدفوعة')
                ) NOT NULL DEFAULT ('غير مدفوعة'),
                "invoiceStatus" varchar CHECK(
                    "invoiceStatus" IN ('DRAFT', 'ISSUED', 'CANCELLED')
                ) NOT NULL DEFAULT ('ISSUED'),
                "currency" varchar(3) NOT NULL DEFAULT ('DZD'),
                "subtotalMinor" integer NOT NULL DEFAULT (0),
                "discountAmountMinor" integer NOT NULL DEFAULT (0),
                "taxAmountMinor" integer NOT NULL DEFAULT (0),
                "totalAmountMinor" integer NOT NULL DEFAULT (0),
                "paidAmountMinor" integer NOT NULL DEFAULT (0),
                "remainingAmountMinor" integer NOT NULL DEFAULT (0),
                "customerSnapshot" text,
                "workshopSnapshot" text,
                "orderNumberSnapshot" text,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer NOT NULL,
                "orderId" integer,
                CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber"),
                CONSTRAINT "REL_a58a78a0e0031dd93a2f56f1e8" UNIQUE ("orderId")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "invoices"(
                    "id",
                    "invoiceNumber",
                    "date",
                    "dueDate",
                    "subtotal",
                    "discount",
                    "discountType",
                    "discountValue",
                    "discountAmount",
                    "taxEnabled",
                    "taxRate",
                    "taxAmount",
                    "totalAmount",
                    "paidAmount",
                    "remainingAmount",
                    "paymentStatus",
                    "invoiceStatus",
                    "currency",
                    "subtotalMinor",
                    "discountAmountMinor",
                    "taxAmountMinor",
                    "totalAmountMinor",
                    "paidAmountMinor",
                    "remainingAmountMinor",
                    "customerSnapshot",
                    "workshopSnapshot",
                    "orderNumberSnapshot",
                    "notes",
                    "cancelledAt",
                    "cancellationReason",
                    "createdAt",
                    "updatedAt",
                    "customerId",
                    "orderId"
                )
            SELECT "id",
                "invoiceNumber",
                "date",
                "dueDate",
                "subtotal",
                "discount",
                "discountType",
                "discountValue",
                "discountAmount",
                "taxEnabled",
                "taxRate",
                "taxAmount",
                "totalAmount",
                "paidAmount",
                "remainingAmount",
                "paymentStatus",
                "invoiceStatus",
                "currency",
                "subtotalMinor",
                "discountAmountMinor",
                "taxAmountMinor",
                "totalAmountMinor",
                "paidAmountMinor",
                "remainingAmountMinor",
                "customerSnapshot",
                "workshopSnapshot",
                "orderNumberSnapshot",
                "notes",
                "cancelledAt",
                "cancellationReason",
                "createdAt",
                "updatedAt",
                "customerId",
                "orderId"
            FROM "temporary_invoices"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_invoices"
        `);
    await queryRunner.query(`
            ALTER TABLE "payments"
                RENAME TO "temporary_payments"
        `);
    await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "amountMinor" integer NOT NULL DEFAULT (0),
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ) NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "reference" text,
                "notes" text,
                "cancelledAt" datetime,
                "cancellationReason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "customerId" integer,
                "invoiceId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "payments"(
                    "id",
                    "amount",
                    "amountMinor",
                    "paymentMethod",
                    "date",
                    "reference",
                    "notes",
                    "cancelledAt",
                    "cancellationReason",
                    "createdAt",
                    "updatedAt",
                    "customerId",
                    "invoiceId"
                )
            SELECT "id",
                "amount",
                "amountMinor",
                "paymentMethod",
                "date",
                "reference",
                "notes",
                "cancelledAt",
                "cancellationReason",
                "createdAt",
                "updatedAt",
                "customerId",
                "invoiceId"
            FROM "temporary_payments"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_payments"
        `);
    await queryRunner.query(`
            ALTER TABLE "invoice_items"
                RENAME TO "temporary_invoice_items"
        `);
    await queryRunner.query(`
            CREATE TABLE "invoice_items" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "description" varchar NOT NULL,
                "productName" text,
                "productType" varchar,
                "productSku" text,
                "reference" text,
                "variantLabel" text,
                "variantSnapshot" text,
                "size" text,
                "color" text,
                "quantity" integer NOT NULL DEFAULT (1),
                "unitPrice" real NOT NULL DEFAULT (0),
                "total" real NOT NULL DEFAULT (0),
                "unitPriceMinor" integer NOT NULL DEFAULT (0),
                "totalMinor" integer NOT NULL DEFAULT (0),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "invoiceId" integer,
                "productId" integer,
                "variantId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "invoice_items"(
                    "id",
                    "description",
                    "productName",
                    "productType",
                    "productSku",
                    "reference",
                    "variantLabel",
                    "variantSnapshot",
                    "size",
                    "color",
                    "quantity",
                    "unitPrice",
                    "total",
                    "unitPriceMinor",
                    "totalMinor",
                    "createdAt",
                    "invoiceId",
                    "productId",
                    "variantId"
                )
            SELECT "id",
                "description",
                "productName",
                "productType",
                "productSku",
                "reference",
                "variantLabel",
                "variantSnapshot",
                "size",
                "color",
                "quantity",
                "unitPrice",
                "total",
                "unitPriceMinor",
                "totalMinor",
                "createdAt",
                "invoiceId",
                "productId",
                "variantId"
            FROM "temporary_invoice_items"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_invoice_items"
        `);
    await queryRunner.query(`
            ALTER TABLE "supplier_advances"
                RENAME TO "temporary_supplier_advances"
        `);
    await queryRunner.query(`
            CREATE TABLE "supplier_advances" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "appliedAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "debtBefore" real,
                "debtAfter" real,
                "status" varchar CHECK("status" IN ('مفتوحة', 'مستعملة', 'مغلقة')) NOT NULL DEFAULT ('مفتوحة'),
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "supplier_advances"(
                    "id",
                    "amount",
                    "appliedAmount",
                    "remainingAmount",
                    "debtBefore",
                    "debtAfter",
                    "status",
                    "date",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "supplierId"
                )
            SELECT "id",
                "amount",
                "appliedAmount",
                "remainingAmount",
                "debtBefore",
                "debtAfter",
                "status",
                "date",
                "notes",
                "createdAt",
                "updatedAt",
                "supplierId"
            FROM "temporary_supplier_advances"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_supplier_advances"
        `);
    await queryRunner.query(`
            ALTER TABLE "inventory_items"
                RENAME TO "temporary_inventory_items"
        `);
    await queryRunner.query(`
            CREATE TABLE "inventory_items" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "name" varchar NOT NULL,
                "reference" text,
                "category" varchar CHECK(
                    "category" IN (
                        'أقمشة',
                        'خيوط',
                        'أزرار',
                        'سحابات',
                        'إكسسوارات',
                        'تغليف',
                        'أدوات'
                    )
                ) NOT NULL,
                "type" text,
                "color" text,
                "quantity" real NOT NULL DEFAULT (0),
                "unit" varchar NOT NULL,
                "unitPrice" real NOT NULL DEFAULT (0),
                "supplier" text,
                "minStockAlert" real NOT NULL DEFAULT (0),
                "location" text,
                "status" varchar CHECK("status" IN ('متوفر', 'قارب على النفاد', 'نفد')) NOT NULL DEFAULT ('متوفر'),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierEntityId" integer,
                CONSTRAINT "UQ_452583a3976cadc318d8b1f8993" UNIQUE ("reference")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "inventory_items"(
                    "id",
                    "name",
                    "reference",
                    "category",
                    "type",
                    "color",
                    "quantity",
                    "unit",
                    "unitPrice",
                    "supplier",
                    "minStockAlert",
                    "location",
                    "status",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "supplierEntityId"
                )
            SELECT "id",
                "name",
                "reference",
                "category",
                "type",
                "color",
                "quantity",
                "unit",
                "unitPrice",
                "supplier",
                "minStockAlert",
                "location",
                "status",
                "notes",
                "createdAt",
                "updatedAt",
                "supplierEntityId"
            FROM "temporary_inventory_items"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_inventory_items"
        `);
    await queryRunner.query(`
            ALTER TABLE "supplier_purchases"
                RENAME TO "temporary_supplier_purchases"
        `);
    await queryRunner.query(`
            CREATE TABLE "supplier_purchases" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "materialName" varchar NOT NULL,
                "materialColor" text,
                "quantityPurchased" real NOT NULL,
                "unit" varchar NOT NULL,
                "totalAmount" real NOT NULL,
                "paidAmount" real NOT NULL DEFAULT (0),
                "remainingAmount" real NOT NULL DEFAULT (0),
                "paymentStatus" varchar CHECK(
                    "paymentStatus" IN ('مدفوع', 'مدفوع جزئياً', 'غير مدفوع')
                ) NOT NULL DEFAULT ('غير مدفوع'),
                "purchaseDate" date NOT NULL DEFAULT (CURRENT_DATE),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierId" integer,
                "inventoryItemId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "supplier_purchases"(
                    "id",
                    "materialName",
                    "materialColor",
                    "quantityPurchased",
                    "unit",
                    "totalAmount",
                    "paidAmount",
                    "remainingAmount",
                    "paymentStatus",
                    "purchaseDate",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "supplierId",
                    "inventoryItemId"
                )
            SELECT "id",
                "materialName",
                "materialColor",
                "quantityPurchased",
                "unit",
                "totalAmount",
                "paidAmount",
                "remainingAmount",
                "paymentStatus",
                "purchaseDate",
                "notes",
                "createdAt",
                "updatedAt",
                "supplierId",
                "inventoryItemId"
            FROM "temporary_supplier_purchases"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_supplier_purchases"
        `);
    await queryRunner.query(`
            ALTER TABLE "supplier_payments"
                RENAME TO "temporary_supplier_payments"
        `);
    await queryRunner.query(`
            CREATE TABLE "supplier_payments" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "amount" real NOT NULL,
                "paymentMethod" varchar CHECK(
                    "paymentMethod" IN (
                        'نقداً',
                        'تحويل',
                        'دفع جزئي',
                        'صك',
                        'دفع لاحق',
                        'أخرى',
                        'رصيد الزبون'
                    )
                ) NOT NULL DEFAULT ('نقداً'),
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "reference" text,
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "supplierId" integer,
                "purchaseId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "supplier_payments"(
                    "id",
                    "amount",
                    "paymentMethod",
                    "date",
                    "reference",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "supplierId",
                    "purchaseId"
                )
            SELECT "id",
                "amount",
                "paymentMethod",
                "date",
                "reference",
                "notes",
                "createdAt",
                "updatedAt",
                "supplierId",
                "purchaseId"
            FROM "temporary_supplier_payments"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_supplier_payments"
        `);
    await queryRunner.query(`
            ALTER TABLE "stock_movements"
                RENAME TO "temporary_stock_movements"
        `);
    await queryRunner.query(`
            CREATE TABLE "stock_movements" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "movementType" varchar CHECK(
                    "movementType" IN (
                        'دخول مخزون',
                        'خروج مخزون',
                        'تعديل كمية',
                        'تلف / ضياع',
                        'استهلاك للإنتاج'
                    )
                ) NOT NULL,
                "quantity" real NOT NULL,
                "previousQuantity" real NOT NULL DEFAULT (0),
                "newQuantity" real NOT NULL DEFAULT (0),
                "unit" text,
                "reason" text,
                "linkedOrderId" text,
                "date" date NOT NULL,
                "notes" text,
                "performedBy" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "inventoryItemId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "stock_movements"(
                    "id",
                    "movementType",
                    "quantity",
                    "previousQuantity",
                    "newQuantity",
                    "unit",
                    "reason",
                    "linkedOrderId",
                    "date",
                    "notes",
                    "performedBy",
                    "createdAt",
                    "updatedAt",
                    "inventoryItemId"
                )
            SELECT "id",
                "movementType",
                "quantity",
                "previousQuantity",
                "newQuantity",
                "unit",
                "reason",
                "linkedOrderId",
                "date",
                "notes",
                "performedBy",
                "createdAt",
                "updatedAt",
                "inventoryItemId"
            FROM "temporary_stock_movements"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_stock_movements"
        `);
    await queryRunner.query(`
            ALTER TABLE "material_consumptions"
                RENAME TO "temporary_material_consumptions"
        `);
    await queryRunner.query(`
            CREATE TABLE "material_consumptions" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "quantityUsed" real NOT NULL,
                "date" date NOT NULL,
                "orderId" text,
                "cost" real NOT NULL DEFAULT (0),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "inventoryItemId" integer,
                "productionBatchId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "material_consumptions"(
                    "id",
                    "quantityUsed",
                    "date",
                    "orderId",
                    "cost",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "inventoryItemId",
                    "productionBatchId"
                )
            SELECT "id",
                "quantityUsed",
                "date",
                "orderId",
                "cost",
                "notes",
                "createdAt",
                "updatedAt",
                "inventoryItemId",
                "productionBatchId"
            FROM "temporary_material_consumptions"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_material_consumptions"
        `);
    await queryRunner.query(`
            ALTER TABLE "production_batches"
                RENAME TO "temporary_production_batches"
        `);
    await queryRunner.query(`
            CREATE TABLE "production_batches" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "batchNumber" varchar(80) NOT NULL,
                "quantityProduced" integer NOT NULL,
                "materialCost" real NOT NULL DEFAULT (0),
                "additionalCost" real NOT NULL DEFAULT (0),
                "totalCost" real NOT NULL DEFAULT (0),
                "unitCost" real NOT NULL DEFAULT (0),
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productId" integer,
                "variantId" integer,
                CONSTRAINT "UQ_3dc31412605975315d506df806d" UNIQUE ("batchNumber")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "production_batches"(
                    "id",
                    "batchNumber",
                    "quantityProduced",
                    "materialCost",
                    "additionalCost",
                    "totalCost",
                    "unitCost",
                    "date",
                    "notes",
                    "createdAt",
                    "updatedAt",
                    "productId",
                    "variantId"
                )
            SELECT "id",
                "batchNumber",
                "quantityProduced",
                "materialCost",
                "additionalCost",
                "totalCost",
                "unitCost",
                "date",
                "notes",
                "createdAt",
                "updatedAt",
                "productId",
                "variantId"
            FROM "temporary_production_batches"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_production_batches"
        `);
    await queryRunner.query(`
            ALTER TABLE "production_materials"
                RENAME TO "temporary_production_materials"
        `);
    await queryRunner.query(`
            CREATE TABLE "production_materials" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "materialName" varchar NOT NULL,
                "unit" varchar NOT NULL,
                "quantityUsed" real NOT NULL,
                "unitCost" real NOT NULL DEFAULT (0),
                "totalCost" real NOT NULL DEFAULT (0),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productionBatchId" integer,
                "inventoryItemId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "production_materials"(
                    "id",
                    "materialName",
                    "unit",
                    "quantityUsed",
                    "unitCost",
                    "totalCost",
                    "createdAt",
                    "productionBatchId",
                    "inventoryItemId"
                )
            SELECT "id",
                "materialName",
                "unit",
                "quantityUsed",
                "unitCost",
                "totalCost",
                "createdAt",
                "productionBatchId",
                "inventoryItemId"
            FROM "temporary_production_materials"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_production_materials"
        `);
    await queryRunner.query(`
            ALTER TABLE "product_stock_movements"
                RENAME TO "temporary_product_stock_movements"
        `);
    await queryRunner.query(`
            CREATE TABLE "product_stock_movements" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "type" varchar CHECK(
                    "type" IN ('إنتاج', 'بيع', 'تعديل', 'إرجاع', 'تلف')
                ) NOT NULL,
                "quantity" integer NOT NULL,
                "previousQuantity" integer NOT NULL,
                "newQuantity" integer NOT NULL,
                "date" date NOT NULL DEFAULT (CURRENT_DATE),
                "reference" text,
                "reason" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productId" integer,
                "variantId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "product_stock_movements"(
                    "id",
                    "type",
                    "quantity",
                    "previousQuantity",
                    "newQuantity",
                    "date",
                    "reference",
                    "reason",
                    "createdAt",
                    "productId",
                    "variantId"
                )
            SELECT "id",
                "type",
                "quantity",
                "previousQuantity",
                "newQuantity",
                "date",
                "reference",
                "reason",
                "createdAt",
                "productId",
                "variantId"
            FROM "temporary_product_stock_movements"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_product_stock_movements"
        `);
    await queryRunner.query(`
            ALTER TABLE "product_variants"
                RENAME TO "temporary_product_variants"
        `);
    await queryRunner.query(`
            CREATE TABLE "product_variants" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "sku" varchar(100) NOT NULL,
                "size" text,
                "color" text,
                "quantityProduced" integer NOT NULL DEFAULT (0),
                "quantityAvailable" integer NOT NULL DEFAULT (0),
                "quantitySold" integer NOT NULL DEFAULT (0),
                "salePrice" real,
                "active" boolean NOT NULL DEFAULT (1),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "productId" integer,
                CONSTRAINT "UQ_46f236f21640f9da218a063a866" UNIQUE ("sku")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "product_variants"(
                    "id",
                    "sku",
                    "size",
                    "color",
                    "quantityProduced",
                    "quantityAvailable",
                    "quantitySold",
                    "salePrice",
                    "active",
                    "createdAt",
                    "updatedAt",
                    "productId"
                )
            SELECT "id",
                "sku",
                "size",
                "color",
                "quantityProduced",
                "quantityAvailable",
                "quantitySold",
                "salePrice",
                "active",
                "createdAt",
                "updatedAt",
                "productId"
            FROM "temporary_product_variants"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_product_variants"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_2510e3fce501b82c073c4d6353"
        `);
    await queryRunner.query(`
            DROP TABLE "worker_role_options"
        `);
    await queryRunner.query(`
            DROP TABLE "workshop_settings"
        `);
    await queryRunner.query(`
            DROP TABLE "piece_prices"
        `);
    await queryRunner.query(`
            DROP TABLE "settings"
        `);
    await queryRunner.query(`
            DROP TABLE "production_stages"
        `);
    await queryRunner.query(`
            DROP TABLE "advances"
        `);
    await queryRunner.query(`
            DROP TABLE "workers"
        `);
    await queryRunner.query(`
            DROP TABLE "worker_productions"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_1e73828d2e62af9c885b53ae63"
        `);
    await queryRunner.query(`
            DROP TABLE "attendances"
        `);
    await queryRunner.query(`
            DROP TABLE "worker_loans"
        `);
    await queryRunner.query(`
            DROP TABLE "loan_repayments"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_d4009efc3234b473cddf638746"
        `);
    await queryRunner.query(`
            DROP TABLE "payrolls"
        `);
    await queryRunner.query(`
            DROP TABLE "salary_payments"
        `);
    await queryRunner.query(`
            DROP TABLE "payroll_loan_deductions"
        `);
    await queryRunner.query(`
            DROP TABLE "payroll_advance_deductions"
        `);
    await queryRunner.query(`
            DROP TABLE "document_sequences"
        `);
    await queryRunner.query(`
            DROP TABLE "expenses"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_customer_credit_customer_date"
        `);
    await queryRunner.query(`
            DROP TABLE "customer_credit_transactions"
        `);
    await queryRunner.query(`
            DROP TABLE "legacy_debts"
        `);
    await queryRunner.query(`
            DROP TABLE "legacy_debt_payments"
        `);
    await queryRunner.query(`
            DROP TABLE "customers"
        `);
    await queryRunner.query(`
            DROP TABLE "customer_notes"
        `);
    await queryRunner.query(`
            DROP TABLE "customer_measurements"
        `);
    await queryRunner.query(`
            DROP TABLE "sales_orders"
        `);
    await queryRunner.query(`
            DROP TABLE "sales_order_items"
        `);
    await queryRunner.query(`
            DROP TABLE "invoices"
        `);
    await queryRunner.query(`
            DROP TABLE "payments"
        `);
    await queryRunner.query(`
            DROP TABLE "invoice_items"
        `);
    await queryRunner.query(`
            DROP TABLE "suppliers"
        `);
    await queryRunner.query(`
            DROP TABLE "supplier_advances"
        `);
    await queryRunner.query(`
            DROP TABLE "inventory_items"
        `);
    await queryRunner.query(`
            DROP TABLE "supplier_purchases"
        `);
    await queryRunner.query(`
            DROP TABLE "supplier_payments"
        `);
    await queryRunner.query(`
            DROP TABLE "stock_movements"
        `);
    await queryRunner.query(`
            DROP TABLE "material_consumptions"
        `);
    await queryRunner.query(`
            DROP TABLE "production_batches"
        `);
    await queryRunner.query(`
            DROP TABLE "production_materials"
        `);
    await queryRunner.query(`
            DROP TABLE "finished_products"
        `);
    await queryRunner.query(`
            DROP TABLE "product_stock_movements"
        `);
    await queryRunner.query(`
            DROP TABLE "product_variants"
        `);
  }
}
