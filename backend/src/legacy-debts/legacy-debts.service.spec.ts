import {
  LegacyDebtStatus,
  LegacyDebtType,
  PaymentMethod,
} from '../common/enums';
import { LegacyDebtPayment } from './entities/legacy-debt-payment.entity';
import { LegacyDebt } from './entities/legacy-debt.entity';
import { LegacyDebtsService } from './legacy-debts.service';

function createHarness(initialDebt?: Partial<LegacyDebt>) {
  const customer = { id: 1, fullName: 'Ahmed', phone: '0550' };
  const supplier = { id: 2, name: 'Textile DZ' };
  let debt = initialDebt
    ? ({
        id: 10,
        type: LegacyDebtType.CUSTOMER_RECEIVABLE,
        customer,
        supplier: null,
        originalAmount: 35_000,
        paidAmount: 0,
        remainingAmount: 35_000,
        originalAmountMinor: 3_500_000,
        paidAmountMinor: 0,
        remainingAmountMinor: 3_500_000,
        debtDate: null,
        dateIsUnknown: true,
        description: null,
        quantity: null,
        unit: null,
        paperReference: null,
        notes: null,
        status: LegacyDebtStatus.OPEN,
        cancelledAt: null,
        cancellationReason: null,
        payments: [],
        createdAt: new Date('2026-08-29T00:00:00Z'),
        updatedAt: new Date('2026-08-29T00:00:00Z'),
        ...initialDebt,
      } as LegacyDebt)
    : null;
  const payments: LegacyDebtPayment[] = [];

  const debtRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value: LegacyDebt) => {
      debt = Object.assign(value, { id: value.id ?? 10 });
      return debt;
    }),
    findOne: jest.fn(async () => debt),
    find: jest.fn(async () => (debt ? [debt] : [])),
  };
  const paymentRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value: LegacyDebtPayment) => {
      const saved = Object.assign(value, {
        id: payments.length + 1,
        createdAt: new Date(),
      });
      payments.push(saved);
      if (debt) debt.payments = payments;
      return saved;
    }),
    findOne: jest.fn(async ({ where }: { where: { id: number } }) =>
      payments.find((payment) => payment.id === where.id)
        ? Object.assign(
            payments.find((payment) => payment.id === where.id)!,
            { legacyDebt: debt },
          )
        : null,
    ),
    createQueryBuilder: jest.fn(() => ({
      select() {
        return this;
      },
      where() {
        return this;
      },
      getRawOne: async () => ({
        total: payments.reduce((sum, payment) => sum + payment.amountMinor, 0),
      }),
    })),
  };
  const customerRepository = {
    findOne: jest.fn(async () => customer),
    exists: jest.fn(async () => true),
  };
  const supplierRepository = {
    findOne: jest.fn(async () => supplier),
    exists: jest.fn(async () => true),
  };
  const manager = {
    getRepository(entity: unknown) {
      if (entity === LegacyDebt) return debtRepository;
      if (entity === LegacyDebtPayment) return paymentRepository;
      if ((entity as { name?: string }).name === 'Customer')
        return customerRepository;
      return supplierRepository;
    },
  };
  const dataSource = {
    transaction: jest.fn(async (callback) => callback(manager)),
  };
  const service = new LegacyDebtsService(
    debtRepository as never,
    paymentRepository as never,
    customerRepository as never,
    supplierRepository as never,
    dataSource as never,
  );

  return {
    service,
    getDebt: () => debt,
    payments,
  };
}

describe('LegacyDebtsService', () => {
  it('accepts a customer legacy receivable with only an amount', async () => {
    const harness = createHarness();

    const result = await harness.service.createForCustomer(1, {
      originalAmount: 35_000,
    });

    expect(result).toMatchObject({
      type: LegacyDebtType.CUSTOMER_RECEIVABLE,
      customerId: 1,
      supplierId: null,
      originalAmount: 35_000,
      paidAmount: 0,
      remainingAmount: 35_000,
      debtDate: null,
      dateIsUnknown: true,
      description: null,
      quantity: null,
      paperReference: null,
      notes: null,
    });
  });

  it('keeps all known historical details on a customer receivable', async () => {
    const harness = createHarness();

    const result = await harness.service.createForCustomer(1, {
      originalAmount: 42_500,
      debtDate: '2025-03-12',
      dateIsUnknown: false,
      description: '3 robes',
      quantity: 3,
      unit: 'pieces',
      paperReference: 'Cahier 2025 - page 18',
      notes: 'Solde repris du cahier.',
    });

    expect(result).toMatchObject({
      originalAmount: 42_500,
      debtDate: '2025-03-12',
      dateIsUnknown: false,
      description: '3 robes',
      quantity: 3,
      unit: 'pieces',
      paperReference: 'Cahier 2025 - page 18',
      notes: 'Solde repris du cahier.',
    });
  });

  it('accepts a supplier legacy payable with only an amount', async () => {
    const harness = createHarness();

    const result = await harness.service.createForSupplier(2, {
      originalAmount: 60_000,
    });

    expect(result).toMatchObject({
      type: LegacyDebtType.SUPPLIER_PAYABLE,
      customerId: null,
      supplierId: 2,
      originalAmount: 60_000,
      remainingAmount: 60_000,
      dateIsUnknown: true,
    });
  });

  it('recalculates partial and full payments from payment history', async () => {
    const harness = createHarness({ payments: [] });

    await harness.service.addCustomerPayment(1, 10, {
      amount: 10_000,
      paymentMethod: PaymentMethod.CASH,
      paymentDate: '2026-09-05',
    });
    expect(harness.getDebt()).toMatchObject({
      paidAmount: 10_000,
      remainingAmount: 25_000,
      status: LegacyDebtStatus.PARTIALLY_PAID,
    });

    await harness.service.addCustomerPayment(1, 10, {
      amount: 25_000,
      paymentMethod: PaymentMethod.TRANSFER,
      paymentDate: '2026-09-10',
    });
    expect(harness.getDebt()).toMatchObject({
      paidAmount: 35_000,
      remainingAmount: 0,
      status: LegacyDebtStatus.PAID,
    });
    expect(harness.payments).toHaveLength(2);
  });

  it('rejects a payment greater than the remaining amount', async () => {
    const harness = createHarness({ payments: [] });

    await expect(
      harness.service.addCustomerPayment(1, 10, {
        amount: 40_000,
        paymentMethod: PaymentMethod.CASH,
      }),
    ).rejects.toThrow('depasse le montant restant');
    expect(harness.payments).toHaveLength(0);
  });

  it('cancels without deleting the debt or its payment history', async () => {
    const harness = createHarness({ payments: [] });
    await harness.service.addCustomerPayment(1, 10, {
      amount: 5_000,
      paymentMethod: PaymentMethod.CASH,
    });

    const cancelled = await harness.service.cancelCustomerDebt(1, 10, {
      reason: 'Correction du cahier',
    });

    expect(cancelled.status).toBe(LegacyDebtStatus.CANCELLED);
    expect(cancelled.cancellationReason).toBe('Correction du cahier');
    expect(cancelled.payments).toHaveLength(1);
  });

  it('refuses new payments after controlled cancellation', async () => {
    const harness = createHarness({ payments: [] });
    await harness.service.cancelCustomerDebt(1, 10, {
      reason: 'Solde invalide',
    });

    await expect(
      harness.service.addCustomerPayment(1, 10, {
        amount: 1_000,
        paymentMethod: PaymentMethod.CASH,
      }),
    ).rejects.toThrow('dette annulee');
    expect(harness.payments).toHaveLength(0);
  });
});
