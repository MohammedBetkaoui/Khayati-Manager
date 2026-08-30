import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  CustomerCreditDirection,
  CustomerCreditTargetType,
  CustomerCreditTransactionType,
  InvoiceStatus,
  LegacyDebtStatus,
  LegacyDebtType,
  PaymentMethod,
  PaymentStatus,
} from '../common/enums';
import { fromMinorUnits, toMinorUnits } from '../common/money';
import { LegacyDebt } from '../legacy-debts/entities/legacy-debt.entity';
import { LegacyDebtPayment } from '../legacy-debts/entities/legacy-debt-payment.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { Payment } from '../sales/entities/payment.entity';
import { ApplyCustomerCreditDto } from './dto/apply-customer-credit.dto';
import { CreateCreditAdvanceDto } from './dto/create-credit-advance.dto';
import { RefundCustomerCreditDto } from './dto/refund-customer-credit.dto';
import { CustomerCreditTransaction } from './entities/customer-credit-transaction.entity';

type CreditTransactionInput = {
  customer: Customer;
  type: CustomerCreditTransactionType;
  direction: CustomerCreditDirection;
  amountMinor: number;
  transactionDate?: string;
  paymentMethod?: PaymentMethod | null;
  invoice?: Invoice | null;
  payment?: Payment | null;
  legacyDebt?: LegacyDebt | null;
  legacyDebtPayment?: LegacyDebtPayment | null;
  reversalOf?: CustomerCreditTransaction | null;
  reference?: string | null;
  notes?: string | null;
};

@Injectable()
export class CustomerCreditsService {
  constructor(private readonly dataSource: DataSource) {}

  async getSummary(customerId: number) {
    const customer = await this.requireCustomer(
      this.dataSource.manager,
      customerId,
    );
    const [transactions, targets] = await Promise.all([
      this.loadTransactions(this.dataSource.manager, customerId),
      this.loadOpenTargets(this.dataSource.manager, customerId),
    ]);
    return this.serializeSummary(customer, transactions, targets);
  }

  async getTransactions(customerId: number) {
    await this.requireCustomer(this.dataSource.manager, customerId);
    const transactions = await this.loadTransactions(
      this.dataSource.manager,
      customerId,
    );
    return {
      data: transactions.map((transaction) =>
        this.serializeTransaction(transaction),
      ),
    };
  }

  async getAvailableCredit(customerId: number) {
    await this.requireCustomer(this.dataSource.manager, customerId);
    return fromMinorUnits(
      await this.getAvailableCreditMinor(this.dataSource.manager, customerId),
    );
  }

  async getAvailableCreditMap(customerIds: number[]) {
    const result = new Map<number, number>();
    if (!customerIds.length) return result;
    const rows = await this.dataSource
      .getRepository(CustomerCreditTransaction)
      .createQueryBuilder('creditTx')
      .select('creditTx.customerId', 'customerId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN creditTx.direction = :credit THEN creditTx.amountMinor ELSE -creditTx.amountMinor END), 0)`,
        'balanceMinor',
      )
      .where('creditTx.customerId IN (:...customerIds)', { customerIds })
      .setParameter('credit', CustomerCreditDirection.CREDIT)
      .groupBy('creditTx.customerId')
      .getRawMany<{ customerId: number | string; balanceMinor: number | string }>();
    for (const row of rows) {
      result.set(
        Number(row.customerId),
        fromMinorUnits(Math.max(0, Number(row.balanceMinor))),
      );
    }
    return result;
  }

  async addAdvance(customerId: number, dto: CreateCreditAdvanceDto) {
    return this.dataSource.transaction(async (manager) => {
      const customer = await this.requireCustomer(manager, customerId);
      const transaction = await this.createTransaction(manager, {
        customer,
        type: CustomerCreditTransactionType.MANUAL_ADVANCE,
        direction: CustomerCreditDirection.CREDIT,
        amountMinor: this.positiveMinor(dto.amount),
        transactionDate: dto.date,
        paymentMethod: dto.paymentMethod,
        reference: this.optionalText(dto.reference),
        notes: this.optionalText(dto.notes),
      });
      return this.buildMutationResult(manager, customer, transaction);
    });
  }

  async refund(customerId: number, dto: RefundCustomerCreditDto) {
    return this.dataSource.transaction(async (manager) => {
      const customer = await this.requireCustomer(manager, customerId);
      const amountMinor = this.positiveMinor(dto.amount);
      await this.assertAvailableCredit(manager, customer.id, amountMinor);
      const transaction = await this.createTransaction(manager, {
        customer,
        type: CustomerCreditTransactionType.REFUND,
        direction: CustomerCreditDirection.DEBIT,
        amountMinor,
        transactionDate: dto.date,
        paymentMethod: dto.paymentMethod,
        reference: this.optionalText(dto.reference),
        notes: this.optionalText(dto.notes),
      });
      return this.buildMutationResult(manager, customer, transaction);
    });
  }

  async apply(customerId: number, dto: ApplyCustomerCreditDto) {
    return this.dataSource.transaction(async (manager) => {
      const customer = await this.requireCustomer(manager, customerId);
      const amountMinor = this.positiveMinor(dto.amount);
      const transaction =
        dto.targetType === CustomerCreditTargetType.INVOICE
          ? await this.applyToInvoice(
              manager,
              customer,
              dto.targetId,
              amountMinor,
              dto.notes,
            )
          : await this.applyToLegacyDebt(
              manager,
              customer,
              dto.targetId,
              amountMinor,
              dto.notes,
            );
      return this.buildMutationResult(manager, customer, transaction);
    });
  }

  applyToSale(customerId: number, saleId: number, amount: number, notes?: string) {
    return this.apply(customerId, {
      targetType: CustomerCreditTargetType.INVOICE,
      targetId: saleId,
      amount,
      notes,
    });
  }

  async reverse(customerId: number, transactionId: number, reason: string) {
    return this.dataSource.transaction(async (manager) => {
      const customer = await this.requireCustomer(manager, customerId);
      const original = await manager.getRepository(CustomerCreditTransaction).findOne({
        where: { id: transactionId, customer: { id: customerId } },
        relations: this.creditTransactionRelations(),
      });
      if (!original) throw new NotFoundException('Credit transaction not found');
      const reversal = await this.reverseTransaction(
        manager,
        customer,
        original,
        reason,
      );
      return this.buildMutationResult(manager, customer, reversal);
    });
  }

  async reverseInvoiceUsagesForCancellation(
    manager: EntityManager,
    customerId: number,
    invoiceId: number,
    reason: string,
  ) {
    const customer = await this.requireCustomer(manager, customerId);
    const transactions = await manager.getRepository(CustomerCreditTransaction).find({
      where: {
        customer: { id: customerId },
        invoice: { id: invoiceId },
        type: CustomerCreditTransactionType.SALE_USAGE,
      },
      relations: this.creditTransactionRelations(),
      order: { id: 'ASC' },
    });
    for (const transaction of transactions) {
      if (!transaction.reversedAt) {
        await this.reverseTransaction(
          manager,
          customer,
          transaction,
          reason,
        );
      }
    }
    return transactions.length;
  }

  async recordOverpayment(
    manager: EntityManager,
    input: {
      customer: Customer;
      amountMinor: number;
      transactionDate: string;
      paymentMethod: PaymentMethod;
      invoice?: Invoice | null;
      payment?: Payment | null;
      reference?: string | null;
      notes?: string | null;
    },
  ) {
    return this.createTransaction(manager, {
      ...input,
      type: CustomerCreditTransactionType.OVERPAYMENT,
      direction: CustomerCreditDirection.CREDIT,
    });
  }

  async useCreditForNewInvoice(
    manager: EntityManager,
    customer: Customer,
    invoice: Invoice,
    amountMinor: number,
    notes?: string | null,
  ) {
    if (amountMinor <= 0) return null;
    return this.applyToInvoice(
      manager,
      customer,
      invoice.id,
      amountMinor,
      notes ?? undefined,
    );
  }

  async getAvailableCreditMinor(manager: EntityManager, customerId: number) {
    const raw = await manager
      .getRepository(CustomerCreditTransaction)
      .createQueryBuilder('creditTx')
      .select(
        `COALESCE(SUM(CASE WHEN creditTx.direction = :credit THEN creditTx.amountMinor ELSE -creditTx.amountMinor END), 0)`,
        'balanceMinor',
      )
      .where('creditTx.customerId = :customerId', { customerId })
      .setParameter('credit', CustomerCreditDirection.CREDIT)
      .getRawOne<{ balanceMinor: number | string }>();
    return Math.max(0, Number(raw?.balanceMinor ?? 0));
  }

  private async applyToInvoice(
    manager: EntityManager,
    customer: Customer,
    invoiceId: number,
    amountMinor: number,
    notes?: string,
  ) {
    await this.assertAvailableCredit(manager, customer.id, amountMinor);
    const invoice = await manager.getRepository(Invoice).findOne({
      where: { id: invoiceId, customer: { id: customer.id } },
      relations: { customer: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found for this customer');
    if (invoice.invoiceStatus !== InvoiceStatus.ISSUED) {
      throw new BadRequestException('Only an issued invoice can use customer credit');
    }
    const remainingMinor = this.invoiceRemainingMinor(invoice);
    if (amountMinor > remainingMinor) {
      throw new BadRequestException('Credit amount exceeds invoice remaining amount');
    }

    const payment = await manager.getRepository(Payment).save(
      manager.getRepository(Payment).create({
        customer,
        invoice,
        amount: fromMinorUnits(amountMinor),
        amountMinor,
        paymentMethod: PaymentMethod.CUSTOMER_CREDIT,
        date: this.today(),
        reference: `CREDIT-${invoice.invoiceNumber}`,
        notes: this.optionalText(notes) ?? 'Customer credit applied to invoice',
        cancelledAt: null,
        cancellationReason: null,
      }),
    );
    this.applyInvoicePayment(invoice, amountMinor);
    await manager.getRepository(Invoice).save(invoice);
    const transaction = await this.createTransaction(manager, {
      customer,
      type: CustomerCreditTransactionType.SALE_USAGE,
      direction: CustomerCreditDirection.DEBIT,
      amountMinor,
      transactionDate: payment.date,
      paymentMethod: PaymentMethod.CUSTOMER_CREDIT,
      invoice,
      payment,
      reference: invoice.invoiceNumber,
      notes: this.optionalText(notes),
    });
    await this.recalculateCustomerTotals(manager, customer.id);
    return transaction;
  }

  private async applyToLegacyDebt(
    manager: EntityManager,
    customer: Customer,
    legacyDebtId: number,
    amountMinor: number,
    notes?: string,
  ) {
    await this.assertAvailableCredit(manager, customer.id, amountMinor);
    const debt = await manager.getRepository(LegacyDebt).findOne({
      where: {
        id: legacyDebtId,
        type: LegacyDebtType.CUSTOMER_RECEIVABLE,
        customer: { id: customer.id },
      },
      relations: { customer: true },
    });
    if (!debt) throw new NotFoundException('Legacy receivable not found');
    if (debt.status === LegacyDebtStatus.CANCELLED) {
      throw new BadRequestException('A cancelled legacy receivable cannot be paid');
    }
    if (amountMinor > debt.remainingAmountMinor) {
      throw new BadRequestException('Credit amount exceeds receivable remaining amount');
    }

    const payment = await manager.getRepository(LegacyDebtPayment).save(
      manager.getRepository(LegacyDebtPayment).create({
        legacyDebt: debt,
        amount: fromMinorUnits(amountMinor),
        amountMinor,
        paymentDate: this.today(),
        paymentMethod: PaymentMethod.CUSTOMER_CREDIT,
        reference: `CREDIT-LEGACY-${debt.id}`,
        notes: this.optionalText(notes) ?? 'Customer credit applied to legacy receivable',
        cancelledAt: null,
        cancellationReason: null,
      }),
    );
    this.applyLegacyDebtPayment(debt, amountMinor);
    await manager.getRepository(LegacyDebt).save(debt);
    return this.createTransaction(manager, {
      customer,
      type: CustomerCreditTransactionType.LEGACY_DEBT_USAGE,
      direction: CustomerCreditDirection.DEBIT,
      amountMinor,
      transactionDate: payment.paymentDate,
      paymentMethod: PaymentMethod.CUSTOMER_CREDIT,
      legacyDebt: debt,
      legacyDebtPayment: payment,
      reference: `LEGACY-${debt.id}`,
      notes: this.optionalText(notes),
    });
  }

  private async reverseInvoiceUsage(
    manager: EntityManager,
    transaction: CustomerCreditTransaction,
    reason: string,
  ) {
    if (!transaction.payment || !transaction.invoice) {
      throw new ConflictException('Invoice credit allocation is incomplete');
    }
    transaction.payment.cancelledAt = new Date();
    transaction.payment.cancellationReason = reason.trim();
    await manager.getRepository(Payment).save(transaction.payment);
    await this.recalculateInvoiceFromPayments(manager, transaction.invoice.id);
  }

  private async reverseTransaction(
    manager: EntityManager,
    customer: Customer,
    original: CustomerCreditTransaction,
    reason: string,
  ) {
    if (original.type === CustomerCreditTransactionType.REVERSAL) {
      throw new ConflictException('A reversal transaction cannot be reversed');
    }
    if (original.reversedAt) {
      throw new ConflictException('This credit transaction is already reversed');
    }

    const reversalDirection =
      original.direction === CustomerCreditDirection.CREDIT
        ? CustomerCreditDirection.DEBIT
        : CustomerCreditDirection.CREDIT;
    if (reversalDirection === CustomerCreditDirection.DEBIT) {
      await this.assertAvailableCredit(
        manager,
        customer.id,
        original.amountMinor,
      );
    }
    if (original.type === CustomerCreditTransactionType.SALE_USAGE) {
      await this.reverseInvoiceUsage(manager, original, reason);
    }
    if (original.type === CustomerCreditTransactionType.LEGACY_DEBT_USAGE) {
      await this.reverseLegacyDebtUsage(manager, original, reason);
    }

    const normalizedReason = reason.trim();
    original.reversedAt = new Date();
    original.reversalReason = normalizedReason;
    await manager.getRepository(CustomerCreditTransaction).save(original);
    const reversal = await this.createTransaction(manager, {
      customer,
      type: CustomerCreditTransactionType.REVERSAL,
      direction: reversalDirection,
      amountMinor: original.amountMinor,
      transactionDate: this.today(),
      paymentMethod: original.paymentMethod,
      invoice: original.invoice ?? null,
      payment: original.payment ?? null,
      legacyDebt: original.legacyDebt ?? null,
      legacyDebtPayment: original.legacyDebtPayment ?? null,
      reversalOf: original,
      reference: original.reference ?? null,
      notes: normalizedReason,
    });
    await this.recalculateCustomerTotals(manager, customer.id);
    return reversal;
  }

  private async reverseLegacyDebtUsage(
    manager: EntityManager,
    transaction: CustomerCreditTransaction,
    reason: string,
  ) {
    if (!transaction.legacyDebt || !transaction.legacyDebtPayment) {
      throw new ConflictException('Legacy credit allocation is incomplete');
    }
    const payment = transaction.legacyDebtPayment;
    if (payment.cancelledAt) {
      throw new ConflictException('Legacy credit payment is already cancelled');
    }
    payment.cancelledAt = new Date();
    payment.cancellationReason = reason.trim();
    await manager.getRepository(LegacyDebtPayment).save(payment);
    await this.recalculateLegacyDebtFromPayments(manager, transaction.legacyDebt.id);
  }

  private async recalculateInvoiceFromPayments(
    manager: EntityManager,
    invoiceId: number,
  ) {
    const invoice = await manager.getRepository(Invoice).findOne({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const raw = await manager
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amountMinor), 0)', 'paidMinor')
      .where('payment.invoiceId = :invoiceId', { invoiceId })
      .andWhere('payment.cancelledAt IS NULL')
      .getRawOne<{ paidMinor: number | string }>();
    const paidMinor = Math.min(
      this.invoiceTotalMinor(invoice),
      Number(raw?.paidMinor ?? 0),
    );
    invoice.paidAmountMinor = paidMinor;
    invoice.paidAmount = fromMinorUnits(paidMinor);
    invoice.remainingAmountMinor = this.invoiceTotalMinor(invoice) - paidMinor;
    invoice.remainingAmount = fromMinorUnits(invoice.remainingAmountMinor);
    invoice.paymentStatus = this.paymentStatus(
      paidMinor,
      invoice.remainingAmountMinor,
    );
    await manager.getRepository(Invoice).save(invoice);
  }

  private async recalculateLegacyDebtFromPayments(
    manager: EntityManager,
    legacyDebtId: number,
  ) {
    const debt = await manager.getRepository(LegacyDebt).findOne({
      where: { id: legacyDebtId },
    });
    if (!debt) throw new NotFoundException('Legacy receivable not found');
    const raw = await manager
      .getRepository(LegacyDebtPayment)
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amountMinor), 0)', 'paidMinor')
      .where('payment.legacyDebtId = :legacyDebtId', { legacyDebtId })
      .andWhere('payment.cancelledAt IS NULL')
      .getRawOne<{ paidMinor: number | string }>();
    const paidMinor = Math.min(debt.originalAmountMinor, Number(raw?.paidMinor ?? 0));
    debt.paidAmountMinor = paidMinor;
    debt.paidAmount = fromMinorUnits(paidMinor);
    debt.remainingAmountMinor = debt.originalAmountMinor - paidMinor;
    debt.remainingAmount = fromMinorUnits(debt.remainingAmountMinor);
    debt.status =
      debt.remainingAmountMinor === 0
        ? LegacyDebtStatus.PAID
        : paidMinor > 0
          ? LegacyDebtStatus.PARTIALLY_PAID
          : LegacyDebtStatus.OPEN;
    await manager.getRepository(LegacyDebt).save(debt);
  }

  private async createTransaction(
    manager: EntityManager,
    input: CreditTransactionInput,
  ) {
    const balanceBeforeMinor = await this.getAvailableCreditMinor(
      manager,
      input.customer.id,
    );
    const balanceAfterMinor =
      input.direction === CustomerCreditDirection.CREDIT
        ? balanceBeforeMinor + input.amountMinor
        : balanceBeforeMinor - input.amountMinor;
    if (balanceAfterMinor < 0) {
      throw new BadRequestException('Insufficient customer credit');
    }
    const repository = manager.getRepository(CustomerCreditTransaction);
    return repository.save(
      repository.create({
        customer: input.customer,
        type: input.type,
        direction: input.direction,
        amount: fromMinorUnits(input.amountMinor),
        amountMinor: input.amountMinor,
        transactionDate: input.transactionDate ?? this.today(),
        paymentMethod: input.paymentMethod ?? null,
        invoice: input.invoice ?? null,
        payment: input.payment ?? null,
        legacyDebt: input.legacyDebt ?? null,
        legacyDebtPayment: input.legacyDebtPayment ?? null,
        reversalOf: input.reversalOf ?? null,
        balanceAfter: fromMinorUnits(balanceAfterMinor),
        balanceAfterMinor,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        reversedAt: null,
        reversalReason: null,
      }),
    );
  }

  private async loadTransactions(manager: EntityManager, customerId: number) {
    return manager.getRepository(CustomerCreditTransaction).find({
      where: { customer: { id: customerId } },
      relations: {
        ...this.creditTransactionRelations(),
      },
      order: { transactionDate: 'DESC', createdAt: 'DESC', id: 'DESC' },
    });
  }

  private async loadOpenTargets(manager: EntityManager, customerId: number) {
    const [invoices, legacyDebts] = await Promise.all([
      manager.getRepository(Invoice).find({
        where: {
          customer: { id: customerId },
          invoiceStatus: InvoiceStatus.ISSUED,
        },
        order: { date: 'ASC', id: 'ASC' },
      }),
      manager.getRepository(LegacyDebt).find({
        where: {
          customer: { id: customerId },
          type: LegacyDebtType.CUSTOMER_RECEIVABLE,
        },
        order: { debtDate: 'ASC', id: 'ASC' },
      }),
    ]);
    return [
      ...invoices
        .filter((invoice) => this.invoiceRemainingMinor(invoice) > 0)
        .map((invoice) => ({
          targetType: CustomerCreditTargetType.INVOICE,
          targetId: invoice.id,
          label: invoice.invoiceNumber,
          date: invoice.date,
          remainingAmount: fromMinorUnits(this.invoiceRemainingMinor(invoice)),
        })),
      ...legacyDebts
        .filter(
          (debt) =>
            debt.status !== LegacyDebtStatus.CANCELLED &&
            debt.remainingAmountMinor > 0,
        )
        .map((debt) => ({
          targetType: CustomerCreditTargetType.LEGACY_DEBT,
          targetId: debt.id,
          label: debt.description || `Legacy receivable #${debt.id}`,
          date: debt.debtDate ?? null,
          remainingAmount: fromMinorUnits(debt.remainingAmountMinor),
        })),
    ];
  }

  private serializeSummary(
    customer: Customer,
    transactions: CustomerCreditTransaction[],
    targets: Awaited<ReturnType<CustomerCreditsService['loadOpenTargets']>>,
  ) {
    let creditsMinor = 0;
    let debitsMinor = 0;
    for (const transaction of transactions) {
      if (transaction.direction === CustomerCreditDirection.CREDIT) {
        creditsMinor += transaction.amountMinor;
      } else {
        debitsMinor += transaction.amountMinor;
      }
    }
    return {
      customerId: customer.id,
      availableCredit: fromMinorUnits(Math.max(0, creditsMinor - debitsMinor)),
      totalCredits: fromMinorUnits(creditsMinor),
      totalDebits: fromMinorUnits(debitsMinor),
      transactionCount: transactions.length,
      targets,
      transactions: transactions.map((transaction) =>
        this.serializeTransaction(transaction),
      ),
    };
  }

  private serializeTransaction(transaction: CustomerCreditTransaction) {
    return {
      id: transaction.id,
      customerId: transaction.customer?.id,
      type: transaction.type,
      direction: transaction.direction,
      amount: transaction.amount,
      transactionDate: transaction.transactionDate,
      date: transaction.transactionDate,
      paymentMethod: transaction.paymentMethod ?? null,
      invoiceId: transaction.invoice?.id ?? null,
      invoiceNumber: transaction.invoice?.invoiceNumber ?? null,
      saleId: transaction.invoice?.id ?? null,
      paymentId: transaction.payment?.id ?? null,
      legacyDebtId: transaction.legacyDebt?.id ?? null,
      legacyDebtPaymentId: transaction.legacyDebtPayment?.id ?? null,
      reversalOfId: transaction.reversalOf?.id ?? null,
      balanceAfter: transaction.balanceAfter,
      reference: transaction.reference ?? null,
      notes: transaction.notes ?? null,
      reversedAt: transaction.reversedAt ?? null,
      reversalReason: transaction.reversalReason ?? null,
      createdAt: transaction.createdAt,
    };
  }

  private async buildMutationResult(
    manager: EntityManager,
    customer: Customer,
    transaction: CustomerCreditTransaction,
  ) {
    const transactions = await this.loadTransactions(manager, customer.id);
    const targets = await this.loadOpenTargets(manager, customer.id);
    return {
      transaction: this.serializeTransaction(transaction),
      credit: this.serializeSummary(customer, transactions, targets),
    };
  }

  private async requireCustomer(manager: EntityManager, customerId: number) {
    const customer = await manager.getRepository(Customer).findOne({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  private async assertAvailableCredit(
    manager: EntityManager,
    customerId: number,
    requestedMinor: number,
  ) {
    const availableMinor = await this.getAvailableCreditMinor(
      manager,
      customerId,
    );
    if (requestedMinor > availableMinor) {
      throw new BadRequestException(
        `Requested credit exceeds available balance (${fromMinorUnits(availableMinor)})`,
      );
    }
  }

  private applyInvoicePayment(invoice: Invoice, amountMinor: number) {
    const totalMinor = this.invoiceTotalMinor(invoice);
    const paidMinor = Math.min(
      totalMinor,
      (invoice.paidAmountMinor || toMinorUnits(invoice.paidAmount)) + amountMinor,
    );
    invoice.paidAmountMinor = paidMinor;
    invoice.paidAmount = fromMinorUnits(paidMinor);
    invoice.remainingAmountMinor = totalMinor - paidMinor;
    invoice.remainingAmount = fromMinorUnits(invoice.remainingAmountMinor);
    invoice.paymentStatus = this.paymentStatus(
      paidMinor,
      invoice.remainingAmountMinor,
    );
  }

  private applyLegacyDebtPayment(debt: LegacyDebt, amountMinor: number) {
    const paidMinor = Math.min(
      debt.originalAmountMinor,
      debt.paidAmountMinor + amountMinor,
    );
    debt.paidAmountMinor = paidMinor;
    debt.paidAmount = fromMinorUnits(paidMinor);
    debt.remainingAmountMinor = debt.originalAmountMinor - paidMinor;
    debt.remainingAmount = fromMinorUnits(debt.remainingAmountMinor);
    debt.status =
      debt.remainingAmountMinor === 0
        ? LegacyDebtStatus.PAID
        : LegacyDebtStatus.PARTIALLY_PAID;
  }

  private async recalculateCustomerTotals(
    manager: EntityManager,
    customerId: number,
  ) {
    const customer = await manager.getRepository(Customer).findOne({
      where: { id: customerId },
    });
    if (!customer) return;
    const raw = await manager
      .getRepository(Invoice)
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.totalAmountMinor), 0)', 'purchasesMinor')
      .addSelect('COALESCE(SUM(invoice.paidAmountMinor), 0)', 'paidMinor')
      .addSelect('COALESCE(SUM(invoice.remainingAmountMinor), 0)', 'debtMinor')
      .where('invoice.customerId = :customerId', { customerId })
      .andWhere('invoice.invoiceStatus = :status', {
        status: InvoiceStatus.ISSUED,
      })
      .getRawOne<Record<string, number | string>>();
    customer.totalPurchases = fromMinorUnits(Number(raw?.purchasesMinor ?? 0));
    customer.totalPaid = fromMinorUnits(Number(raw?.paidMinor ?? 0));
    customer.totalDebt = fromMinorUnits(Number(raw?.debtMinor ?? 0));
    await manager.getRepository(Customer).save(customer);
  }

  private paymentStatus(paidMinor: number, remainingMinor: number) {
    if (remainingMinor === 0) return PaymentStatus.PAID;
    if (paidMinor > 0) return PaymentStatus.PARTIALLY_PAID;
    return PaymentStatus.UNPAID;
  }

  private invoiceTotalMinor(invoice: Invoice) {
    return invoice.totalAmountMinor || toMinorUnits(invoice.totalAmount);
  }

  private invoiceRemainingMinor(invoice: Invoice) {
    return invoice.remainingAmountMinor || toMinorUnits(invoice.remainingAmount);
  }

  private positiveMinor(amount: number) {
    const minor = toMinorUnits(amount);
    if (!Number.isSafeInteger(minor) || minor <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }
    return minor;
  }

  private optionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  private creditTransactionRelations() {
    return {
      customer: true,
      invoice: true,
      payment: true,
      legacyDebt: true,
      legacyDebtPayment: true,
      reversalOf: true,
    } as const;
  }
}
