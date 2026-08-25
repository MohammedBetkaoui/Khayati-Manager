import Database from 'better-sqlite3';
import { copyFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { toMinorUnits } from '../common/money';

type ColumnRow = { name: string };

function tableExists(database: Database.Database, table: string) {
  return Boolean(
    database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table),
  );
}

function columns(database: Database.Database, table: string) {
  if (!tableExists(database, table)) return new Set<string>();
  const rows = database.prepare(`PRAGMA table_info("${table}")`).all() as ColumnRow[];
  return new Set(rows.map((row) => row.name));
}

function addMissingColumns(
  database: Database.Database,
  table: string,
  definitions: Record<string, string>,
) {
  const existing = columns(database, table);
  for (const [name, definition] of Object.entries(definitions)) {
    if (!existing.has(name)) {
      database.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${definition}`);
    }
  }
}

function needsPreparation(databasePath: string) {
  const database = new Database(databasePath, { readonly: true });
  try {
    const invoiceColumns = columns(database, 'invoices');
    return (
      invoiceColumns.size > 0 &&
      (!invoiceColumns.has('invoiceStatus') ||
        !invoiceColumns.has('subtotalMinor') ||
        !invoiceColumns.has('customerSnapshot'))
    );
  } finally {
    database.close();
  }
}

function createBackup(databasePath: string) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
  const backupName = `${basename(databasePath)}.backup-before-invoices-${timestamp}`;
  copyFileSync(databasePath, join(dirname(databasePath), backupName));
}

export function prepareInvoiceDatabase(databasePath: string) {
  if (!existsSync(databasePath) || !needsPreparation(databasePath)) return;

  createBackup(databasePath);
  const database = new Database(databasePath);
  database.pragma('foreign_keys = OFF');

  try {
    database.transaction(() => {
      addMissingColumns(database, 'invoices', {
        discountType: "varchar NOT NULL DEFAULT 'NONE'",
        discountValue: 'real NOT NULL DEFAULT 0',
        discountAmount: 'real NOT NULL DEFAULT 0',
        taxEnabled: 'boolean NOT NULL DEFAULT 0',
        taxRate: 'real NOT NULL DEFAULT 0',
        taxAmount: 'real NOT NULL DEFAULT 0',
        invoiceStatus: "varchar NOT NULL DEFAULT 'ISSUED'",
        currency: "varchar(3) NOT NULL DEFAULT 'DZD'",
        subtotalMinor: 'integer NOT NULL DEFAULT 0',
        discountAmountMinor: 'integer NOT NULL DEFAULT 0',
        taxAmountMinor: 'integer NOT NULL DEFAULT 0',
        totalAmountMinor: 'integer NOT NULL DEFAULT 0',
        paidAmountMinor: 'integer NOT NULL DEFAULT 0',
        remainingAmountMinor: 'integer NOT NULL DEFAULT 0',
        customerSnapshot: 'text',
        workshopSnapshot: 'text',
        orderNumberSnapshot: 'text',
        cancelledAt: 'datetime',
        cancellationReason: 'text',
      });

      addMissingColumns(database, 'invoice_items', {
        productName: 'text',
        reference: 'text',
        variantSnapshot: 'text',
        size: 'text',
        color: 'text',
        unitPriceMinor: 'integer NOT NULL DEFAULT 0',
        totalMinor: 'integer NOT NULL DEFAULT 0',
      });

      addMissingColumns(database, 'payments', {
        amountMinor: 'integer NOT NULL DEFAULT 0',
      });

      const invoices = database
        .prepare(
          `SELECT invoice.id, invoice.subtotal, invoice.discount,
                  invoice.totalAmount, invoice.paidAmount,
                  invoice.remainingAmount, invoice.customerSnapshot,
                  customer.fullName, customer.phone, customer.address,
                  customer.email
             FROM invoices invoice
             LEFT JOIN customers customer ON customer.id = invoice.customerId`,
        )
        .all() as Array<Record<string, unknown>>;
      const updateInvoice = database.prepare(
        `UPDATE invoices
            SET discountType = ?, discountValue = ?, discountAmount = ?,
                subtotalMinor = ?, discountAmountMinor = ?, taxAmountMinor = ?,
                totalAmountMinor = ?, paidAmountMinor = ?, remainingAmountMinor = ?,
                customerSnapshot = COALESCE(customerSnapshot, ?)
          WHERE id = ?`,
      );

      for (const invoice of invoices) {
        const discount = Number(invoice.discount ?? 0);
        const customerSnapshot = invoice.fullName
          ? JSON.stringify({
              fullName: String(invoice.fullName),
              phone: String(invoice.phone ?? ''),
              address: invoice.address ? String(invoice.address) : null,
              email: invoice.email ? String(invoice.email) : null,
            })
          : null;
        updateInvoice.run(
          discount > 0 ? 'FIXED' : 'NONE',
          discount,
          discount,
          toMinorUnits(Number(invoice.subtotal ?? 0)),
          toMinorUnits(discount),
          0,
          toMinorUnits(Number(invoice.totalAmount ?? 0)),
          toMinorUnits(Number(invoice.paidAmount ?? 0)),
          toMinorUnits(Number(invoice.remainingAmount ?? 0)),
          customerSnapshot,
          invoice.id,
        );
      }

      const items = database
        .prepare(
          `SELECT item.id, item.description, item.productSku, item.variantLabel,
                  item.unitPrice, item.total, product.name AS currentProductName,
                  variant.size AS currentSize, variant.color AS currentColor
             FROM invoice_items item
             LEFT JOIN finished_products product ON product.id = item.productId
             LEFT JOIN product_variants variant ON variant.id = item.variantId`,
        )
        .all() as Array<Record<string, unknown>>;
      const updateItem = database.prepare(
        `UPDATE invoice_items
            SET productName = COALESCE(productName, ?),
                reference = COALESCE(reference, ?),
                variantSnapshot = COALESCE(variantSnapshot, ?),
                size = COALESCE(size, ?), color = COALESCE(color, ?),
                unitPriceMinor = ?, totalMinor = ?
          WHERE id = ?`,
      );

      for (const item of items) {
        updateItem.run(
          String(item.currentProductName ?? item.description ?? ''),
          item.productSku ? String(item.productSku) : null,
          item.variantLabel ? String(item.variantLabel) : null,
          item.currentSize ? String(item.currentSize) : null,
          item.currentColor ? String(item.currentColor) : null,
          toMinorUnits(Number(item.unitPrice ?? 0)),
          toMinorUnits(Number(item.total ?? 0)),
          item.id,
        );
      }

      database
        .prepare('UPDATE payments SET amountMinor = ROUND(amount * 100)')
        .run();
    })();
  } finally {
    database.pragma('foreign_keys = ON');
    database.close();
  }
}
