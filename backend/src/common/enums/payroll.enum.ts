export enum PayrollStatus {
  DRAFT = 'DRAFT',
  CALCULATED = 'CALCULATED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum AdvanceType {
  SALARY = 'SALARY_ADVANCE',
  OTHER = 'OTHER',
}

export enum BalanceStatus {
  OPEN = 'OPEN',
  PARTIALLY_SETTLED = 'PARTIALLY_SETTLED',
  SETTLED = 'SETTLED',
}

export enum LoanStatus {
  OPEN = 'OPEN',
  PARTIALLY_REPAID = 'PARTIALLY_REPAID',
  REPAID = 'REPAID',
}

export enum PayrollPaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}
