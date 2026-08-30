import { prepareCustomerCreditsDatabase } from './prepare-customer-credits-database';
import { prepareInvoiceDatabase } from './prepare-invoice-database';
import { prepareInvoicePaymentsDatabase } from './prepare-invoice-payments-database';
import { prepareLegacyDebtsDatabase } from './prepare-legacy-debts-database';

/**
 * One-time bridge for databases produced before migrations existed.
 *
 * These routines only add missing invoice/debt structures or reconstruct
 * already-recorded payment history. The old payroll preparer is intentionally
 * excluded because it can rename/drop historical tables.
 */
export function prepareHistoricalSchemaForBaseline(databasePath: string) {
  prepareInvoiceDatabase(databasePath);
  prepareInvoicePaymentsDatabase(databasePath);
  prepareLegacyDebtsDatabase(databasePath);
  prepareCustomerCreditsDatabase(databasePath);
}
