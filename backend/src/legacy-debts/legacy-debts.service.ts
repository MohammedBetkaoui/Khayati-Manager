import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import {
  LegacyDebtStatus,
  LegacyDebtType,
  PaymentMethod,
} from '../common/enums';
import { fromMinorUnits, toMinorUnits } from '../common/money';
import { Supplier } from '../inventory/entities/supplier.entity';
import { Customer } from '../sales/entities/customer.entity';
import { CancelLegacyDebtDto } from './dto/cancel-legacy-debt.dto';
import { CreateLegacyDebtPaymentDto } from './dto/create-legacy-debt-payment.dto';
import { CreateLegacyDebtDto } from './dto/create-legacy-debt.dto';
import { UpdateLegacyDebtDto } from './dto/update-legacy-debt.dto';
import { LegacyDebtPayment } from './entities/legacy-debt-payment.entity';
import { LegacyDebt } from './entities/legacy-debt.entity';

export type LegacyDebtSummary = {
  original: number;
  paid: number;
  remaining: number;
  count: number;
};

@Injectable()
export class LegacyDebtsService {
  constructor(
    @InjectRepository(LegacyDebt)
    private readonly debtsRepository: Repository<LegacyDebt>,
    @InjectRepository(LegacyDebtPayment)
    private readonly paymentsRepository: Repository<LegacyDebtPayment>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    private readonly dataSource: DataSource,
  ) {}

  createForCustomer(customerId: number, dto: CreateLegacyDebtDto) {
    return this.create(LegacyDebtType.CUSTOMER_RECEIVABLE, customerId, dto);
  }

  createForSupplier(supplierId: number, dto: CreateLegacyDebtDto) {
    return this.create(LegacyDebtType.SUPPLIER_PAYABLE, supplierId, dto);
  }

  findForCustomer(customerId: number) {
    return this.findAll(LegacyDebtType.CUSTOMER_RECEIVABLE, customerId);
  }

  findForSupplier(supplierId: number) {
    return this.findAll(LegacyDebtType.SUPPLIER_PAYABLE, supplierId);
  }

  findCustomerDebt(customerId: number, debtId: number) {
    return this.findOne(
      LegacyDebtType.CUSTOMER_RECEIVABLE,
      customerId,
      debtId,
    );
  }

  findSupplierDebt(supplierId: number, debtId: number) {
    return this.findOne(
      LegacyDebtType.SUPPLIER_PAYABLE,
      supplierId,
      debtId,
    );
  }

  updateCustomerDebt(
    customerId: number,
    debtId: number,
    dto: UpdateLegacyDebtDto,
  ) {
    return this.update(
      LegacyDebtType.CUSTOMER_RECEIVABLE,
      customerId,
      debtId,
      dto,
    );
  }

  updateSupplierDebt(
    supplierId: number,
    debtId: number,
    dto: UpdateLegacyDebtDto,
  ) {
    return this.update(
      LegacyDebtType.SUPPLIER_PAYABLE,
      supplierId,
      debtId,
      dto,
    );
  }

  addCustomerPayment(
    customerId: number,
    debtId: number,
    dto: CreateLegacyDebtPaymentDto,
  ) {
    return this.addPayment(
      LegacyDebtType.CUSTOMER_RECEIVABLE,
      customerId,
      debtId,
      dto,
    );
  }

  addSupplierPayment(
    supplierId: number,
    debtId: number,
    dto: CreateLegacyDebtPaymentDto,
  ) {
    return this.addPayment(
      LegacyDebtType.SUPPLIER_PAYABLE,
      supplierId,
      debtId,
      dto,
    );
  }

  cancelCustomerDebt(
    customerId: number,
    debtId: number,
    dto: CancelLegacyDebtDto,
  ) {
    return this.cancel(
      LegacyDebtType.CUSTOMER_RECEIVABLE,
      customerId,
      debtId,
      dto,
    );
  }

  cancelSupplierDebt(
    supplierId: number,
    debtId: number,
    dto: CancelLegacyDebtDto,
  ) {
    return this.cancel(
      LegacyDebtType.SUPPLIER_PAYABLE,
      supplierId,
      debtId,
      dto,
    );
  }

  getCustomerSummary(customerId: number) {
    return this.getSummary(LegacyDebtType.CUSTOMER_RECEIVABLE, customerId);
  }

  getSupplierSummary(supplierId: number) {
    return this.getSummary(LegacyDebtType.SUPPLIER_PAYABLE, supplierId);
  }

  getCustomerOutstandingMap(customerIds: number[]) {
    return this.getOutstandingMap(
      LegacyDebtType.CUSTOMER_RECEIVABLE,
      customerIds,
    );
  }

  getSupplierOutstandingMap(supplierIds: number[]) {
    return this.getOutstandingMap(
      LegacyDebtType.SUPPLIER_PAYABLE,
      supplierIds,
    );
  }

  async getGlobalSummary() {
    const [customers, suppliers] = await Promise.all([
      this.getTypeSummary(LegacyDebtType.CUSTOMER_RECEIVABLE),
      this.getTypeSummary(LegacyDebtType.SUPPLIER_PAYABLE),
    ]);
    return { customers, suppliers };
  }

  getAllPayments() {
    return this.paymentsRepository.find({
      where: { cancelledAt: IsNull() },
      relations: { legacyDebt: { customer: true, supplier: true } },
      order: { paymentDate: 'DESC', id: 'DESC' },
    });
  }

  getAllDebts() {
    return this.debtsRepository.find({
      relations: { customer: true, supplier: true, payments: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  private async create(
    type: LegacyDebtType,
    ownerId: number,
    dto: CreateLegacyDebtDto,
  ) {
    const debtId = await this.dataSource.transaction(async (manager) => {
      const owner = await this.findOwnerOrFail(manager, type, ownerId);
      const originalAmountMinor = toMinorUnits(dto.originalAmount);
      if (originalAmountMinor <= 0) {
        throw new BadRequestException(
          'Le montant initial doit etre superieur a zero.',
        );
      }

      const repository = manager.getRepository(LegacyDebt);
      const debt = repository.create({
        type,
        customer:
          type === LegacyDebtType.CUSTOMER_RECEIVABLE
            ? (owner as Customer)
            : null,
        supplier:
          type === LegacyDebtType.SUPPLIER_PAYABLE
            ? (owner as Supplier)
            : null,
        originalAmount: fromMinorUnits(originalAmountMinor),
        paidAmount: 0,
        remainingAmount: fromMinorUnits(originalAmountMinor),
        originalAmountMinor,
        paidAmountMinor: 0,
        remainingAmountMinor: originalAmountMinor,
        debtDate: dto.dateIsUnknown ? null : (dto.debtDate ?? null),
        dateIsUnknown: Boolean(dto.dateIsUnknown || !dto.debtDate),
        description: this.optionalText(dto.description),
        quantity: dto.quantity ?? null,
        unit: this.optionalText(dto.unit),
        paperReference: this.optionalText(dto.paperReference),
        notes: this.optionalText(dto.notes),
        status: LegacyDebtStatus.OPEN,
        cancelledAt: null,
        cancellationReason: null,
      });
      const saved = await repository.save(debt);
      return saved.id;
    });

    return this.findOne(type, ownerId, debtId);
  }

  private async findAll(type: LegacyDebtType, ownerId: number) {
    await this.ensureOwnerExists(type, ownerId);
    const debts = await this.debtsRepository.find({
      where: this.ownerWhere(type, ownerId),
      relations: { customer: true, supplier: true, payments: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return {
      data: debts.map((debt) => this.serializeDebt(debt)),
      summary: this.summarize(debts),
    };
  }

  private async findOne(
    type: LegacyDebtType,
    ownerId: number,
    debtId: number,
  ) {
    const debt = await this.findDebtOrFail(type, ownerId, debtId);
    return this.serializeDebt(debt);
  }

  private async update(
    type: LegacyDebtType,
    ownerId: number,
    debtId: number,
    dto: UpdateLegacyDebtDto,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const debt = await this.findDebtOrFail(type, ownerId, debtId, manager);
      if (debt.status === LegacyDebtStatus.CANCELLED) {
        throw new BadRequestException(
          'Une dette annulee ne peut plus etre modifiee.',
        );
      }

      if (dto.originalAmount !== undefined) {
        const originalAmountMinor = toMinorUnits(dto.originalAmount);
        if (originalAmountMinor < debt.paidAmountMinor) {
          throw new BadRequestException(
            'Le montant initial ne peut pas etre inferieur au montant deja paye.',
          );
        }
        debt.originalAmountMinor = originalAmountMinor;
        debt.originalAmount = fromMinorUnits(originalAmountMinor);
      }
      if (dto.dateIsUnknown === true) {
        debt.dateIsUnknown = true;
        debt.debtDate = null;
      } else if (dto.debtDate !== undefined) {
        debt.debtDate = dto.debtDate;
        debt.dateIsUnknown = false;
      } else if (dto.dateIsUnknown === false) {
        debt.dateIsUnknown = false;
      }
      if (dto.description !== undefined)
        debt.description = this.optionalText(dto.description);
      if (dto.quantity !== undefined) debt.quantity = dto.quantity;
      if (dto.unit !== undefined) debt.unit = this.optionalText(dto.unit);
      if (dto.paperReference !== undefined)
        debt.paperReference = this.optionalText(dto.paperReference);
      if (dto.notes !== undefined) debt.notes = this.optionalText(dto.notes);

      this.applyCalculatedAmounts(debt, debt.paidAmountMinor);
      await manager.getRepository(LegacyDebt).save(debt);
    });
    return this.findOne(type, ownerId, debtId);
  }

  private async addPayment(
    type: LegacyDebtType,
    ownerId: number,
    debtId: number,
    dto: CreateLegacyDebtPaymentDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const debt = await this.findDebtOrFail(type, ownerId, debtId, manager);
      if (debt.status === LegacyDebtStatus.CANCELLED) {
        throw new BadRequestException(
          'Aucun paiement ne peut etre ajoute a une dette annulee.',
        );
      }

      const paidAmountMinor = Math.max(
        await this.sumPaymentsMinor(manager, debt.id),
        debt.paidAmountMinor,
      );
      this.applyCalculatedAmounts(debt, paidAmountMinor);
      const paymentAmountMinor = toMinorUnits(dto.amount);
      if (paymentAmountMinor <= 0) {
        throw new BadRequestException(
          'Le montant du paiement doit etre superieur a zero.',
        );
      }
      if (paymentAmountMinor > debt.remainingAmountMinor) {
        throw new BadRequestException(
          'Le montant du paiement depasse le montant restant.',
        );
      }

      const payment = await manager.getRepository(LegacyDebtPayment).save(
        manager.getRepository(LegacyDebtPayment).create({
          legacyDebt: debt,
          amount: fromMinorUnits(paymentAmountMinor),
          amountMinor: paymentAmountMinor,
          paymentDate: dto.paymentDate ?? this.todayKey(),
          paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
          reference: this.optionalText(dto.reference),
          notes: this.optionalText(dto.notes),
        }),
      );

      this.applyCalculatedAmounts(debt, paidAmountMinor + paymentAmountMinor);
      await manager.getRepository(LegacyDebt).update(debt.id, {
        paidAmount: debt.paidAmount,
        remainingAmount: debt.remainingAmount,
        paidAmountMinor: debt.paidAmountMinor,
        remainingAmountMinor: debt.remainingAmountMinor,
        status: debt.status,
      });
      debt.payments = [
        ...(debt.payments ?? []).filter((entry) => entry.id !== payment.id),
        payment,
      ];

      return {
        payment: this.serializePayment(payment),
        debt: this.serializeDebt(debt),
      };
    });
  }

  private async cancel(
    type: LegacyDebtType,
    ownerId: number,
    debtId: number,
    dto: CancelLegacyDebtDto,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const debt = await this.findDebtOrFail(type, ownerId, debtId, manager);
      if (debt.status !== LegacyDebtStatus.CANCELLED) {
        debt.status = LegacyDebtStatus.CANCELLED;
        debt.cancelledAt = new Date();
        debt.cancellationReason = this.optionalText(dto.reason);
        await manager.getRepository(LegacyDebt).save(debt);
      }
    });
    return this.findOne(type, ownerId, debtId);
  }

  private async getSummary(type: LegacyDebtType, ownerId: number) {
    await this.ensureOwnerExists(type, ownerId);
    const debts = await this.debtsRepository.find({
      where: this.ownerWhere(type, ownerId),
    });
    return this.summarize(debts);
  }

  private async getTypeSummary(type: LegacyDebtType) {
    const debts = await this.debtsRepository.find({ where: { type } });
    return this.summarize(debts);
  }

  private async getOutstandingMap(type: LegacyDebtType, ownerIds: number[]) {
    const result = new Map<number, number>();
    if (!ownerIds.length) return result;
    const relation =
      type === LegacyDebtType.CUSTOMER_RECEIVABLE ? 'customer' : 'supplier';
    const debts = await this.debtsRepository.find({
      where:
        relation === 'customer'
          ? { type, customer: { id: In(ownerIds) } }
          : { type, supplier: { id: In(ownerIds) } },
      relations: { customer: true, supplier: true },
    });
    for (const debt of debts) {
      if (debt.status === LegacyDebtStatus.CANCELLED) continue;
      const ownerId = debt.customer?.id ?? debt.supplier?.id;
      if (!ownerId) continue;
      result.set(
        ownerId,
        fromMinorUnits(
          toMinorUnits(result.get(ownerId) ?? 0) + debt.remainingAmountMinor,
        ),
      );
    }
    return result;
  }

  private async findDebtOrFail(
    type: LegacyDebtType,
    ownerId: number,
    debtId: number,
    manager?: EntityManager,
  ) {
    const repository = manager
      ? manager.getRepository(LegacyDebt)
      : this.debtsRepository;
    const debt = await repository.findOne({
      where: { id: debtId, ...this.ownerWhere(type, ownerId) },
      relations: { customer: true, supplier: true, payments: true },
    });
    if (!debt) {
      throw new NotFoundException('Solde anterieur introuvable.');
    }
    return debt;
  }

  private async findOwnerOrFail(
    manager: EntityManager,
    type: LegacyDebtType,
    ownerId: number,
  ) {
    if (type === LegacyDebtType.CUSTOMER_RECEIVABLE) {
      const customer = await manager.getRepository(Customer).findOne({
        where: { id: ownerId },
      });
      if (!customer) throw new NotFoundException('Client introuvable.');
      return customer;
    }
    const supplier = await manager.getRepository(Supplier).findOne({
      where: { id: ownerId },
    });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable.');
    return supplier;
  }

  private async ensureOwnerExists(type: LegacyDebtType, ownerId: number) {
    const repository =
      type === LegacyDebtType.CUSTOMER_RECEIVABLE
        ? this.customersRepository
        : this.suppliersRepository;
    if (!(await repository.exists({ where: { id: ownerId } }))) {
      throw new NotFoundException(
        type === LegacyDebtType.CUSTOMER_RECEIVABLE
          ? 'Client introuvable.'
          : 'Fournisseur introuvable.',
      );
    }
  }

  private ownerWhere(type: LegacyDebtType, ownerId: number) {
    return type === LegacyDebtType.CUSTOMER_RECEIVABLE
      ? { type, customer: { id: ownerId } }
      : { type, supplier: { id: ownerId } };
  }

  private async sumPaymentsMinor(manager: EntityManager, debtId: number) {
    const raw = await manager
      .getRepository(LegacyDebtPayment)
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amountMinor), 0)', 'total')
      .where('payment.legacyDebtId = :debtId', { debtId })
      .andWhere('payment.cancelledAt IS NULL')
      .getRawOne<{ total: number | string }>();
    return Number(raw?.total ?? 0);
  }

  private applyCalculatedAmounts(debt: LegacyDebt, paidAmountMinor: number) {
    debt.paidAmountMinor = paidAmountMinor;
    debt.remainingAmountMinor = Math.max(
      debt.originalAmountMinor - paidAmountMinor,
      0,
    );
    debt.paidAmount = fromMinorUnits(debt.paidAmountMinor);
    debt.remainingAmount = fromMinorUnits(debt.remainingAmountMinor);
    debt.originalAmount = fromMinorUnits(debt.originalAmountMinor);
    debt.status = this.paymentStatus(
      debt.paidAmountMinor,
      debt.remainingAmountMinor,
    );
  }

  private paymentStatus(paidAmountMinor: number, remainingAmountMinor: number) {
    if (remainingAmountMinor <= 0) return LegacyDebtStatus.PAID;
    if (paidAmountMinor > 0) return LegacyDebtStatus.PARTIALLY_PAID;
    return LegacyDebtStatus.OPEN;
  }

  private summarize(debts: LegacyDebt[]): LegacyDebtSummary {
    const activeDebts = debts.filter(
      (debt) => debt.status !== LegacyDebtStatus.CANCELLED,
    );
    const originalMinor = activeDebts.reduce(
      (sum, debt) => sum + debt.originalAmountMinor,
      0,
    );
    const paidMinor = activeDebts.reduce(
      (sum, debt) => sum + debt.paidAmountMinor,
      0,
    );
    const remainingMinor = activeDebts.reduce(
      (sum, debt) => sum + debt.remainingAmountMinor,
      0,
    );
    return {
      original: fromMinorUnits(originalMinor),
      paid: fromMinorUnits(paidMinor),
      remaining: fromMinorUnits(remainingMinor),
      count: activeDebts.length,
    };
  }

  private serializeDebt(debt: LegacyDebt) {
    const payments = [...(debt.payments ?? [])]
      .filter((payment) => !payment.cancelledAt)
      .sort(
        (left, right) =>
          right.paymentDate.localeCompare(left.paymentDate) || right.id - left.id,
      );
    return {
      id: debt.id,
      type: debt.type,
      customerId: debt.customer?.id ?? null,
      customerName: debt.customer?.fullName ?? null,
      supplierId: debt.supplier?.id ?? null,
      supplierName: debt.supplier?.name ?? null,
      originalAmount: fromMinorUnits(debt.originalAmountMinor),
      paidAmount: fromMinorUnits(debt.paidAmountMinor),
      remainingAmount: fromMinorUnits(debt.remainingAmountMinor),
      debtDate: debt.debtDate ?? null,
      dateIsUnknown: debt.dateIsUnknown,
      description: debt.description ?? null,
      quantity: debt.quantity ?? null,
      unit: debt.unit ?? null,
      paperReference: debt.paperReference ?? null,
      notes: debt.notes ?? null,
      status:
        debt.status === LegacyDebtStatus.CANCELLED
          ? LegacyDebtStatus.CANCELLED
          : this.paymentStatus(
              debt.paidAmountMinor,
              debt.remainingAmountMinor,
            ),
      cancelledAt: debt.cancelledAt ?? null,
      cancellationReason: debt.cancellationReason ?? null,
      payments: payments.map((payment) =>
        this.serializePayment(payment, debt),
      ),
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,
    };
  }

  private serializePayment(
    payment: LegacyDebtPayment,
    parentDebt?: LegacyDebt,
  ) {
    const debt = payment.legacyDebt ?? parentDebt;
    return {
      id: payment.id,
      legacyDebtId: debt?.id ?? null,
      type: debt?.type ?? null,
      customerId: debt?.customer?.id ?? null,
      supplierId: debt?.supplier?.id ?? null,
      amount: fromMinorUnits(payment.amountMinor),
      paymentDate: payment.paymentDate,
      date: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      paymentMethodCode: this.enumKey(PaymentMethod, payment.paymentMethod),
      reference: payment.reference ?? null,
      notes: payment.notes ?? null,
      createdAt: payment.createdAt,
    };
  }

  private enumKey<T extends Record<string, string>>(values: T, value: string) {
    return (
      Object.entries(values).find(([, enumValue]) => enumValue === value)?.[0] ??
      value
    );
  }

  private optionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private todayKey() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
