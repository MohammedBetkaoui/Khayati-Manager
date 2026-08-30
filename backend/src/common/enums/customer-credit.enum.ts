export enum CustomerCreditTransactionType {
  OVERPAYMENT = 'OVERPAYMENT',
  MANUAL_ADVANCE = 'MANUAL_ADVANCE',
  SALE_USAGE = 'SALE_USAGE',
  LEGACY_DEBT_USAGE = 'LEGACY_DEBT_USAGE',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
  REVERSAL = 'REVERSAL',
}

export enum CustomerCreditDirection {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum CustomerCreditTargetType {
  INVOICE = 'INVOICE',
  LEGACY_DEBT = 'LEGACY_DEBT',
}
