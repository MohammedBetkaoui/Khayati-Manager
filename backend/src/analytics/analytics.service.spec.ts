import {
  CustomerCreditDirection,
  CustomerCreditTransactionType,
  ExpenseCategory,
  ExpenseStatus,
  FinishedProductStatus,
  InvoiceStatus,
  LegacyDebtStatus,
  LegacyDebtType,
  PayrollStatus,
  PaymentMethod,
  SalaryType,
} from '../common/enums';
import { AnalyticsService } from './analytics.service';

function repository(
  rows: unknown[],
  queryResult: {
    rawOne?: Record<string, unknown>;
    rawMany?: Record<string, unknown>[];
  } = {},
) {
  const builder = {
    innerJoin: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    setParameter: jest.fn(),
    groupBy: jest.fn(),
    getRawOne: jest.fn().mockResolvedValue(queryResult.rawOne ?? { total: 0 }),
    getRawMany: jest.fn().mockResolvedValue(queryResult.rawMany ?? []),
  };
  for (const method of [
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'setParameter',
    'groupBy',
  ] as const) {
    builder[method].mockReturnValue(builder);
  }
  return {
    find: jest.fn().mockResolvedValue(rows),
    createQueryBuilder: jest.fn().mockReturnValue(builder),
  };
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('AnalyticsService', () => {
  it('keeps charges, receipts and cash outflows financially distinct', async () => {
    const today = dateKey();
    const customer = {
      id: 1,
      fullName: 'Customer A',
      phone: '0550',
      totalDebt: 400,
    };
    const product = {
      id: 1,
      name: 'Model A',
      creationDate: today,
      status: FinishedProductStatus.ACTIVE,
      quantityAvailable: 8,
      quantityProduced: 10,
      quantitySold: 2,
    };
    const invoice = {
      id: 1,
      invoiceNumber: 'INV-1',
      invoiceStatus: InvoiceStatus.ISSUED,
      date: today,
      dueDate: today,
      totalAmount: 1000,
      remainingAmount: 400,
      customer,
      items: [
        {
          product,
          productName: product.name,
          description: product.name,
          quantity: 2,
          total: 1000,
        },
      ],
    };
    const worker = { id: 1, fullName: 'Worker A' };
    const payroll = {
      id: 1,
      worker,
      status: PayrollStatus.PARTIALLY_PAID,
      salaryTypeSnapshot: SalaryType.PIECE,
      periodEnd: today,
      grossAmount: 300,
      paidAmount: 200,
      remainingAmount: 100,
      piecesCompleted: 20,
    };
    const supplier = {
      id: 1,
      name: 'Supplier A',
      phone: '0660',
      totalDebt: 250,
    };
    const purchase = {
      id: 1,
      supplier,
      materialName: 'Fabric',
      purchaseDate: today,
      totalAmount: 500,
      remainingAmount: 250,
    };
    const expense = {
      id: 1,
      date: today,
      amount: 100,
      paidAmount: 100,
      category: ExpenseCategory.RENT,
      status: ExpenseStatus.PAID,
      archivedAt: null,
    };
    const customerLegacyDebt = {
      id: 1,
      type: LegacyDebtType.CUSTOMER_RECEIVABLE,
      status: LegacyDebtStatus.PARTIALLY_PAID,
      customer,
      supplier: null,
      remainingAmount: 300,
      payments: [],
    };
    const supplierLegacyDebt = {
      id: 2,
      type: LegacyDebtType.SUPPLIER_PAYABLE,
      status: LegacyDebtStatus.PARTIALLY_PAID,
      customer: null,
      supplier,
      remainingAmount: 400,
      payments: [],
    };

    const service = new AnalyticsService(
      repository([invoice], {
        rawMany: [{ productId: product.id, lastSaleDate: today }],
      }) as never,
      repository([
        { date: today, amount: 600, paymentMethod: PaymentMethod.CASH },
        {
          date: today,
          amount: 20,
          paymentMethod: PaymentMethod.CUSTOMER_CREDIT,
        },
      ]) as never,
      repository([customer]) as never,
      repository([expense]) as never,
      repository([payroll]) as never,
      repository([{ date: today, amount: 200 }]) as never,
      repository([{ date: today, amount: 50 }]) as never,
      repository([supplier]) as never,
      repository([purchase]) as never,
      repository([{ date: today, amount: 200 }]) as never,
      repository([{ date: today, amount: 50 }]) as never,
      repository([product]) as never,
      repository([{ date: today, quantityProduced: 10 }]) as never,
      repository([customerLegacyDebt, supplierLegacyDebt]) as never,
      repository([
        {
          paymentDate: today,
          amount: 100,
          paymentMethod: PaymentMethod.CASH,
          legacyDebt: customerLegacyDebt,
        },
        {
          paymentDate: today,
          amount: 20,
          paymentMethod: PaymentMethod.CUSTOMER_CREDIT,
          legacyDebt: customerLegacyDebt,
        },
        {
          paymentDate: today,
          amount: 150,
          paymentMethod: PaymentMethod.CASH,
          legacyDebt: supplierLegacyDebt,
        },
      ]) as never,
      repository(
        [
          {
            transactionDate: today,
            amount: 50,
            direction: CustomerCreditDirection.CREDIT,
            type: CustomerCreditTransactionType.OVERPAYMENT,
            reversalOf: null,
          },
          {
            transactionDate: today,
            amount: 20,
            direction: CustomerCreditDirection.DEBIT,
            type: CustomerCreditTransactionType.SALE_USAGE,
            reversalOf: null,
          },
        ],
        { rawOne: { balance: 30 } },
      ) as never,
    );

    const result = await service.getDashboard(12);
    const currentFinancial = result.financialTrend.at(-1);
    const currentExpenses = result.expenseBreakdown.at(-1);
    const currentProduction = result.productionSales.at(-1);
    const currentDebt = result.debtTrend.at(-1);

    expect(currentFinancial).toMatchObject({
      sales: 1000,
      receipts: 750,
      outflows: 750,
    });
    expect(currentExpenses).toMatchObject({
      salaries: 300,
      materials: 500,
      rent: 100,
    });
    expect(currentProduction).toMatchObject({ produced: 10, sold: 2 });
    expect(currentDebt).toMatchObject({
      customerDebt: 700,
      supplierDebt: 650,
    });
    expect(result.summary).toMatchObject({
      sales: 1000,
      receipts: 750,
      outflows: 750,
      estimatedCashFlow: 0,
      customerDebt: 700,
      currentCustomerDebt: 400,
      legacyCustomerDebt: 300,
      supplierDebt: 650,
      currentSupplierDebt: 250,
      legacySupplierDebt: 400,
      payrollPaid: 200,
      payrollRemaining: 100,
      customerCreditBalance: 30,
    });
    expect(result.topProducts[0]).toMatchObject({
      productName: 'Model A',
      quantity: 2,
      revenue: 1000,
    });
    expect(result.insights.pieceWorkers[0]).toMatchObject({
      workerName: 'Worker A',
      pieces: 20,
      amount: 300,
    });
  });
});
