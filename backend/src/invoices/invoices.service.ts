import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import {
  CustomerStatus,
  DiscountType,
  FinishedProductStatus,
  InvoiceStatus,
  PaymentStatus,
  SalesOrderStatus,
} from '../common/enums';
import { fromMinorUnits, toMinorUnits } from '../common/money';
import { FinishedProduct } from '../inventory/entities/finished-product.entity';
import { ProductVariant } from '../inventory/entities/product-variant.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Customer } from '../sales/entities/customer.entity';
import { InvoiceItem } from '../sales/entities/invoice-item.entity';
import {
  Invoice,
  InvoiceWorkshopSnapshot,
} from '../sales/entities/invoice.entity';
import { Payment } from '../sales/entities/payment.entity';
import { WorkshopSettings } from '../settings/entities/workshop-settings.entity';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { CreateInvoiceFromOrderDto } from './dto/create-invoice-from-order.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { InvoiceLineDto } from './dto/invoice-line.dto';
import { UpdateInvoiceDraftDto } from './dto/update-invoice-draft.dto';
import {
  calculateInvoiceAmounts,
  InvoiceCalculationResult,
} from './invoice-calculation';
import { InvoiceNumberService } from './invoice-number.service';

type InvoiceFinancialInput = {
  issueDate?: string;
  dueDate?: string;
  discountType?: DiscountType;
  discountValue?: number;
  taxEnabled?: boolean;
  taxRate?: number;
  currency?: string;
  notes?: string;
  invoiceStatus?: InvoiceStatus;
  initialPayment?: CreateInvoicePaymentDto;
};

type PreparedInvoiceLine = {
  product: FinishedProduct | null;
  variant: ProductVariant | null;
  productName: string;
  description: string;
  reference: string | null;
  variantSnapshot: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPriceMinor: number;
};

type ResolvedInvoiceOptions = {
  issueDate: string;
  dueDate: string | null;
  invoiceStatus: InvoiceStatus;
  currency: string;
  notes: string | null;
  calculation: InvoiceCalculationResult;
  workshopSnapshot: InvoiceWorkshopSnapshot | null;
};

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly dataSource: DataSource,
    private readonly invoiceNumberService: InvoiceNumberService,
  ) {}

  async create(dto: CreateInvoiceDto) {
    if (dto.orderId) {
      throw new BadRequestException(
        'Use the from-order invoice operation for an existing order',
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const customer = await this.requireActiveCustomer(
        manager,
        dto.customerId,
      );
      const lines = await this.resolveManualLines(manager, dto.items);
      const invoice = await this.persistNewInvoice(
        manager,
        customer,
        lines,
        dto,
        null,
      );
      if (dto.initialPayment) {
        await this.recordInvoicePayment(manager, invoice, dto.initialPayment);
      }
      await this.recalculateCustomerTotals(manager, customer);
      return this.loadInvoice(manager, invoice.id);
    });
  }

  async createFromOrder(orderId: number, dto: CreateInvoiceFromOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).findOne({
        where: { id: orderId },
        relations: {
          customer: true,
          invoice: true,
          items: { product: true, variant: true },
        },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.invoice) {
        throw new ConflictException('This order already has an invoice');
      }
      if (order.status === SalesOrderStatus.CANCELLED) {
        throw new BadRequestException('A cancelled order cannot be invoiced');
      }

      const requestedStatus = dto.invoiceStatus ?? InvoiceStatus.ISSUED;
      if (
        requestedStatus === InvoiceStatus.ISSUED &&
        order.status !== SalesOrderStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          'The order must be confirmed before issuing its invoice',
        );
      }

      const customer = await this.requireActiveCustomer(
        manager,
        order.customer.id,
      );
      const lines = dto.items
        ? await this.resolveManualLines(manager, dto.items)
        : this.snapshotOrderLines(order.items);
      const invoice = await this.persistNewInvoice(
        manager,
        customer,
        lines,
        dto,
        order,
      );
      if (dto.initialPayment) {
        await this.recordInvoicePayment(manager, invoice, dto.initialPayment);
      }

      if (requestedStatus === InvoiceStatus.ISSUED) {
        order.invoice = invoice;
        order.status = SalesOrderStatus.INVOICED;
        await manager.getRepository(Order).save(order);
      }
      await this.recalculateCustomerTotals(manager, customer);
      return this.loadInvoice(manager, invoice.id);
    });
  }

  async findAll(filters: InvoiceFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.order', 'order');

    if (filters.search?.trim()) {
      const search = `%${filters.search.trim()}%`;
      query.andWhere(
        new Brackets((where) => {
          where
            .where('invoice.invoiceNumber LIKE :search', { search })
            .orWhere('customer.fullName LIKE :search', { search })
            .orWhere('customer.phone LIKE :search', { search })
            .orWhere('invoice.orderNumberSnapshot LIKE :search', { search });
        }),
      );
    }
    if (filters.invoiceStatus) {
      query.andWhere('invoice.invoiceStatus = :invoiceStatus', {
        invoiceStatus: filters.invoiceStatus,
      });
    }
    if (filters.paymentStatus) {
      query.andWhere('invoice.paymentStatus = :paymentStatus', {
        paymentStatus: filters.paymentStatus,
      });
    }
    if (filters.customerId) {
      query.andWhere('customer.id = :customerId', {
        customerId: filters.customerId,
      });
    }
    if (filters.orderId) {
      query.andWhere('order.id = :orderId', { orderId: filters.orderId });
    }
    if (filters.startDate) {
      query.andWhere('invoice.date >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters.endDate) {
      query.andWhere('invoice.date <= :endDate', {
        endDate: filters.endDate,
      });
    }

    const [data, total] = await query
      .orderBy('invoice.date', 'DESC')
      .addOrderBy('invoice.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, pagination: { page, limit, total } };
  }

  async findOne(id: number) {
    return this.loadInvoice(this.dataSource.manager, id);
  }

  async addPayment(
    invoiceId: number,
    dto: CreateInvoicePaymentDto,
    expectedCustomerId?: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const invoice = await this.loadInvoice(manager, invoiceId);
      if (
        expectedCustomerId !== undefined &&
        invoice.customer.id !== expectedCustomerId
      ) {
        throw new BadRequestException(
          'customerId does not match the invoice customer',
        );
      }
      const payment = await this.recordInvoicePayment(manager, invoice, dto);
      await this.recalculateCustomerTotals(manager, invoice.customer);
      return {
        payment,
        invoice: await this.loadInvoice(manager, invoice.id),
      };
    });
  }

  async getPayments(invoiceId: number) {
    await this.findOne(invoiceId);
    const data = await this.dataSource.getRepository(Payment).find({
      where: { invoice: { id: invoiceId } },
      relations: { customer: true, invoice: true },
      order: { date: 'DESC', createdAt: 'DESC', id: 'DESC' },
    });
    return { data };
  }

  async updateDraft(id: number, dto: UpdateInvoiceDraftDto) {
    if (dto.initialPayment) {
      throw new BadRequestException(
        'Use the invoice payment operation to add a payment',
      );
    }
    if (dto.invoiceStatus && dto.invoiceStatus !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Use the issue operation to issue a draft');
    }

    return this.dataSource.transaction(async (manager) => {
      const invoice = await this.loadInvoice(manager, id);
      if (invoice.invoiceStatus !== InvoiceStatus.DRAFT) {
        throw new ConflictException('Only a draft invoice can be modified');
      }
      if (invoice.payments?.length) {
        throw new ConflictException('A draft with payments cannot be modified');
      }
      if (dto.orderId && dto.orderId !== invoice.order?.id) {
        throw new BadRequestException('The linked order cannot be changed');
      }

      const oldCustomer = invoice.customer;
      const customerId = dto.customerId ?? oldCustomer.id;
      if (invoice.order && customerId !== invoice.order.customer.id) {
        throw new BadRequestException(
          'The invoice customer must match the order customer',
        );
      }
      const customer = await this.requireActiveCustomer(manager, customerId);
      const lines = dto.items
        ? await this.resolveManualLines(manager, dto.items)
        : this.snapshotInvoiceLines(invoice.items);
      const options = await this.resolveInvoiceOptions(
        manager,
        lines,
        dto,
        invoice,
      );

      invoice.customer = customer;
      invoice.customerSnapshot = this.snapshotCustomer(customer);
      invoice.date = options.issueDate;
      invoice.dueDate = options.dueDate;
      invoice.currency = options.currency;
      invoice.notes = options.notes;
      invoice.workshopSnapshot = options.workshopSnapshot;
      this.applyCalculation(invoice, options.calculation);
      await manager.getRepository(Invoice).save(invoice);

      await manager.getRepository(InvoiceItem).remove(invoice.items);
      invoice.items = await this.saveInvoiceItems(manager, invoice, lines);

      await this.recalculateCustomerTotals(manager, customer);
      if (oldCustomer.id !== customer.id) {
        await this.recalculateCustomerTotals(manager, oldCustomer);
      }
      return this.loadInvoice(manager, invoice.id);
    });
  }

  async issueDraft(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const invoice = await this.loadInvoice(manager, id);
      if (invoice.invoiceStatus !== InvoiceStatus.DRAFT) {
        throw new ConflictException('Only a draft invoice can be issued');
      }
      if (invoice.order) {
        if (invoice.order.status !== SalesOrderStatus.CONFIRMED) {
          throw new BadRequestException(
            'The order must be confirmed before issuing its invoice',
          );
        }
        invoice.order.status = SalesOrderStatus.INVOICED;
        await manager.getRepository(Order).save(invoice.order);
      }

      invoice.invoiceStatus = InvoiceStatus.ISSUED;
      await manager.getRepository(Invoice).save(invoice);
      await this.recalculateCustomerTotals(manager, invoice.customer);
      return this.loadInvoice(manager, invoice.id);
    });
  }

  async cancel(id: number, dto: CancelInvoiceDto) {
    return this.dataSource.transaction(async (manager) => {
      const invoice = await this.loadInvoice(manager, id);
      if (invoice.invoiceStatus === InvoiceStatus.CANCELLED) {
        throw new ConflictException('Invoice is already cancelled');
      }
      if (this.invoiceAmountMinor(invoice, 'paid') > 0) {
        throw new ConflictException(
          'A paid invoice requires payment reversal before cancellation',
        );
      }

      invoice.invoiceStatus = InvoiceStatus.CANCELLED;
      invoice.cancelledAt = new Date();
      invoice.cancellationReason = dto.reason.trim();
      await manager.getRepository(Invoice).save(invoice);

      if (invoice.order?.status === SalesOrderStatus.INVOICED) {
        invoice.order.status = SalesOrderStatus.CONFIRMED;
        await manager.getRepository(Order).save(invoice.order);
      }
      await this.recalculateCustomerTotals(manager, invoice.customer);
      return this.loadInvoice(manager, invoice.id);
    });
  }

  private async persistNewInvoice(
    manager: EntityManager,
    customer: Customer,
    lines: PreparedInvoiceLine[],
    input: InvoiceFinancialInput,
    order: Order | null,
  ) {
    const options = await this.resolveInvoiceOptions(manager, lines, input);
    if (options.invoiceStatus === InvoiceStatus.CANCELLED) {
      throw new BadRequestException(
        'An invoice cannot be created as cancelled',
      );
    }

    const invoiceRepository = manager.getRepository(Invoice);
    const invoice = invoiceRepository.create({
      invoiceNumber: await this.invoiceNumberService.next(
        manager,
        options.issueDate,
      ),
      customer,
      customerSnapshot: this.snapshotCustomer(customer),
      order,
      orderNumberSnapshot: order?.orderNumber ?? null,
      date: options.issueDate,
      dueDate: options.dueDate,
      invoiceStatus: options.invoiceStatus,
      paymentStatus: PaymentStatus.UNPAID,
      currency: options.currency,
      notes: options.notes,
      workshopSnapshot: options.workshopSnapshot,
      paidAmount: 0,
      paidAmountMinor: 0,
    });
    invoice.order = order;
    this.applyCalculation(invoice, options.calculation);
    await invoiceRepository.save(invoice);
    if (order) {
      await manager
        .createQueryBuilder()
        .relation(Invoice, 'order')
        .of(invoice.id)
        .set(order.id);
    }
    invoice.items = await this.saveInvoiceItems(manager, invoice, lines);
    return invoice;
  }

  private async resolveInvoiceOptions(
    manager: EntityManager,
    lines: PreparedInvoiceLine[],
    input: InvoiceFinancialInput,
    base?: Invoice,
  ): Promise<ResolvedInvoiceOptions> {
    const settings = await manager.getRepository(WorkshopSettings).findOne({
      where: {},
      order: { id: 'ASC' },
    });
    const issueDate = input.issueDate ?? base?.date ?? this.today();
    const dueDate =
      input.dueDate === undefined ? (base?.dueDate ?? null) : input.dueDate;
    if (dueDate && dueDate < issueDate) {
      throw new BadRequestException('Due date cannot be before issue date');
    }

    const taxEnabled =
      input.taxEnabled ??
      base?.taxEnabled ??
      settings?.defaultTaxEnabled ??
      false;
    const taxRate =
      input.taxRate ?? base?.taxRate ?? settings?.defaultTaxRate ?? 0;
    const calculation = calculateInvoiceAmounts({
      lines: lines.map((line) => ({
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
      })),
      discountType: input.discountType ?? base?.discountType,
      discountValue: input.discountValue ?? base?.discountValue ?? 0,
      taxEnabled,
      taxRate,
    });
    const currency = (
      input.currency ??
      base?.currency ??
      settings?.defaultCurrency ??
      'DZD'
    ).toUpperCase();

    return {
      issueDate,
      dueDate,
      invoiceStatus:
        input.invoiceStatus ?? base?.invoiceStatus ?? InvoiceStatus.ISSUED,
      currency,
      notes:
        input.notes === undefined
          ? (base?.notes ?? null)
          : this.optionalText(input.notes),
      calculation,
      workshopSnapshot: settings
        ? this.snapshotWorkshop(settings)
        : (base?.workshopSnapshot ?? null),
    };
  }

  private applyCalculation(
    invoice: Invoice,
    calculation: InvoiceCalculationResult,
  ) {
    invoice.subtotalMinor = calculation.subtotalMinor;
    invoice.subtotal = fromMinorUnits(calculation.subtotalMinor);
    invoice.discountType = calculation.discountType;
    invoice.discountValue = calculation.discountValue;
    invoice.discountAmountMinor = calculation.discountAmountMinor;
    invoice.discountAmount = fromMinorUnits(calculation.discountAmountMinor);
    invoice.discount = invoice.discountAmount;
    invoice.taxEnabled = calculation.taxEnabled;
    invoice.taxRate = calculation.taxRate;
    invoice.taxAmountMinor = calculation.taxAmountMinor;
    invoice.taxAmount = fromMinorUnits(calculation.taxAmountMinor);
    invoice.totalAmountMinor = calculation.totalAmountMinor;
    invoice.totalAmount = fromMinorUnits(calculation.totalAmountMinor);
    invoice.remainingAmountMinor =
      calculation.totalAmountMinor - (invoice.paidAmountMinor ?? 0);
    invoice.remainingAmount = fromMinorUnits(invoice.remainingAmountMinor);
    invoice.paymentStatus =
      invoice.remainingAmountMinor === 0
        ? PaymentStatus.PAID
        : PaymentStatus.UNPAID;
  }

  private async saveInvoiceItems(
    manager: EntityManager,
    invoice: Invoice,
    lines: PreparedInvoiceLine[],
  ) {
    const repository = manager.getRepository(InvoiceItem);
    const items = lines.map((line) => {
      const totalMinor = line.quantity * line.unitPriceMinor;
      return repository.create({
        invoice,
        product: line.product,
        variant: line.variant,
        productName: line.productName,
        description: line.description,
        productType: line.productName,
        productSku: line.reference,
        reference: line.reference,
        variantLabel: line.variantSnapshot,
        variantSnapshot: line.variantSnapshot,
        size: line.size,
        color: line.color,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        unitPrice: fromMinorUnits(line.unitPriceMinor),
        totalMinor,
        total: fromMinorUnits(totalMinor),
      });
    });
    return repository.save(items);
  }

  private async recordInvoicePayment(
    manager: EntityManager,
    invoice: Invoice,
    dto: CreateInvoicePaymentDto,
  ) {
    if (invoice.invoiceStatus === InvoiceStatus.DRAFT) {
      throw new BadRequestException('A draft invoice cannot receive payments');
    }
    if (invoice.invoiceStatus === InvoiceStatus.CANCELLED) {
      throw new BadRequestException(
        'A cancelled invoice cannot receive payments',
      );
    }

    const amount = Number(dto.amount);
    if (
      !Number.isFinite(amount) ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6
    ) {
      throw new BadRequestException(
        'Payment amount must contain at most two decimal places',
      );
    }
    const amountMinor = toMinorUnits(amount);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const paymentRepository = manager.getRepository(Payment);
    const existingPayments = await paymentRepository.find({
      where: { invoice: { id: invoice.id } },
    });
    const linkedPaymentsMinor = existingPayments.reduce(
      (sum, payment) =>
        sum +
        (Number.isInteger(payment.amountMinor)
          ? payment.amountMinor
          : toMinorUnits(payment.amount)),
      0,
    );
    const recordedPaidMinor = Math.max(
      linkedPaymentsMinor,
      this.invoiceAmountMinor(invoice, 'paid'),
    );
    const totalAmountMinor = this.invoiceAmountMinor(invoice, 'total');
    if (recordedPaidMinor > totalAmountMinor) {
      throw new ConflictException(
        'Invoice payment history exceeds the invoice total',
      );
    }

    const remainingAmountMinor = totalAmountMinor - recordedPaidMinor;
    if (amountMinor > remainingAmountMinor) {
      throw new BadRequestException(
        `Payment exceeds remaining amount (${fromMinorUnits(remainingAmountMinor)})`,
      );
    }

    this.applyPaymentState(
      invoice,
      totalAmountMinor,
      recordedPaidMinor + amountMinor,
    );
    await manager.getRepository(Invoice).save(invoice);
    return paymentRepository.save(
      paymentRepository.create({
        customer: invoice.customer,
        invoice,
        amount: fromMinorUnits(amountMinor),
        amountMinor,
        paymentMethod: dto.paymentMethod,
        date: dto.paymentDate ?? this.today(),
        reference: this.optionalText(dto.reference),
        notes: this.optionalText(dto.notes),
      }),
    );
  }

  private applyPaymentState(
    invoice: Invoice,
    totalAmountMinor: number,
    paidAmountMinor: number,
  ) {
    const remainingAmountMinor = totalAmountMinor - paidAmountMinor;
    invoice.paidAmountMinor = paidAmountMinor;
    invoice.paidAmount = fromMinorUnits(paidAmountMinor);
    invoice.remainingAmountMinor = remainingAmountMinor;
    invoice.remainingAmount = fromMinorUnits(remainingAmountMinor);
    invoice.paymentStatus =
      remainingAmountMinor === 0
        ? PaymentStatus.PAID
        : paidAmountMinor > 0
          ? PaymentStatus.PARTIALLY_PAID
          : PaymentStatus.UNPAID;
  }

  private async resolveManualLines(
    manager: EntityManager,
    items: InvoiceLineDto[],
  ) {
    if (!items?.length) {
      throw new BadRequestException(
        'An invoice must contain at least one item',
      );
    }
    return Promise.all(
      items.map((item) => this.resolveManualLine(manager, item)),
    );
  }

  private async resolveManualLine(
    manager: EntityManager,
    item: InvoiceLineDto,
  ): Promise<PreparedInvoiceLine> {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new BadRequestException('Item quantity must be a positive integer');
    }
    if (!item.productId) {
      if (item.variantId) {
        throw new BadRequestException('variantId requires productId');
      }
      const productName = this.optionalText(
        item.productName ?? item.description,
      );
      if (!productName) {
        throw new BadRequestException(
          'A custom invoice item requires productName or description',
        );
      }
      if (item.unitPrice === undefined) {
        throw new BadRequestException(
          'A custom invoice item requires unitPrice',
        );
      }
      return this.prepareLine(item, null, null, productName, item.unitPrice);
    }

    const product = await manager.getRepository(FinishedProduct).findOne({
      where: { id: item.productId },
      relations: { variants: true },
    });
    if (!product) throw new NotFoundException('Finished product not found');
    if (product.status !== FinishedProductStatus.ACTIVE) {
      throw new BadRequestException('Archived products cannot be invoiced');
    }

    let variant: ProductVariant | null = null;
    if (item.variantId) {
      variant =
        product.variants.find((candidate) => candidate.id === item.variantId) ??
        null;
      if (!variant) {
        throw new BadRequestException(
          'The selected variant does not belong to the product',
        );
      }
      if (!variant.active) {
        throw new BadRequestException('Inactive variants cannot be invoiced');
      }
    }

    const unitPrice =
      item.unitPrice ?? variant?.salePrice ?? product.salePrice ?? 0;
    return this.prepareLine(item, product, variant, product.name, unitPrice);
  }

  private prepareLine(
    item: InvoiceLineDto,
    product: FinishedProduct | null,
    variant: ProductVariant | null,
    defaultName: string,
    unitPrice: number,
  ): PreparedInvoiceLine {
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new BadRequestException('Item unit price must be a valid amount');
    }
    const productName = this.optionalText(item.productName) ?? defaultName;
    const size = this.optionalText(item.size) ?? variant?.size ?? null;
    const color = this.optionalText(item.color) ?? variant?.color ?? null;
    const generatedVariant = [size, color].filter(Boolean).join(' / ');
    const variantSnapshot =
      this.optionalText(item.variant) ?? (generatedVariant || null);

    return {
      product,
      variant,
      productName,
      description: this.optionalText(item.description) ?? productName,
      reference:
        this.optionalText(item.reference) ??
        variant?.sku ??
        product?.sku ??
        null,
      variantSnapshot,
      size,
      color,
      quantity: item.quantity,
      unitPriceMinor: toMinorUnits(unitPrice),
    };
  }

  private snapshotOrderLines(items: OrderItem[]): PreparedInvoiceLine[] {
    if (!items?.length) {
      throw new BadRequestException('The order has no items to invoice');
    }
    return items.map((item) => ({
      product: item.product ?? null,
      variant: item.variant ?? null,
      productName: item.productName,
      description: item.description ?? item.productName,
      reference: item.reference ?? null,
      variantSnapshot: item.variantSnapshot ?? null,
      size: item.size ?? null,
      color: item.color ?? null,
      quantity: item.quantity,
      unitPriceMinor: toMinorUnits(item.unitPrice),
    }));
  }

  private snapshotInvoiceLines(items: InvoiceItem[]): PreparedInvoiceLine[] {
    return items.map((item) => ({
      product: item.product ?? null,
      variant: item.variant ?? null,
      productName: item.productName ?? item.description,
      description: item.description,
      reference: item.reference ?? item.productSku ?? null,
      variantSnapshot: item.variantSnapshot ?? item.variantLabel ?? null,
      size: item.size ?? null,
      color: item.color ?? null,
      quantity: item.quantity,
      unitPriceMinor: toMinorUnits(item.unitPrice),
    }));
  }

  private async requireActiveCustomer(manager: EntityManager, id: number) {
    const customer = await manager.getRepository(Customer).findOneBy({ id });
    if (!customer) throw new NotFoundException('Customer not found');
    if (customer.status !== CustomerStatus.ACTIVE) {
      throw new BadRequestException('Archived customers cannot be invoiced');
    }
    return customer;
  }

  private async recalculateCustomerTotals(
    manager: EntityManager,
    customer: Customer,
  ) {
    const invoices = await manager.getRepository(Invoice).find({
      where: {
        customer: { id: customer.id },
        invoiceStatus: InvoiceStatus.ISSUED,
      },
      order: { date: 'ASC', id: 'ASC' },
    });
    const totalPurchasesMinor = invoices.reduce(
      (sum, invoice) => sum + this.invoiceAmountMinor(invoice, 'total'),
      0,
    );
    const totalPaidMinor = invoices.reduce(
      (sum, invoice) => sum + this.invoiceAmountMinor(invoice, 'paid'),
      0,
    );

    customer.totalPurchases = fromMinorUnits(totalPurchasesMinor);
    customer.totalPaid = fromMinorUnits(totalPaidMinor);
    customer.totalDebt = fromMinorUnits(
      Math.max(0, totalPurchasesMinor - totalPaidMinor),
    );
    if (invoices.length) {
      customer.firstVisitDate = invoices[0].date;
      customer.lastVisitDate = invoices[invoices.length - 1].date;
    }
    await manager.getRepository(Customer).save(customer);
  }

  private invoiceAmountMinor(invoice: Invoice, amount: 'total' | 'paid') {
    const minor =
      amount === 'total' ? invoice.totalAmountMinor : invoice.paidAmountMinor;
    if (Number.isInteger(minor)) return minor;
    return toMinorUnits(
      amount === 'total' ? invoice.totalAmount : invoice.paidAmount,
    );
  }

  private async loadInvoice(manager: EntityManager, id: number) {
    const invoice = await manager.getRepository(Invoice).findOne({
      where: { id },
      relations: {
        customer: true,
        order: { customer: true },
        items: { product: true, variant: true },
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  private snapshotCustomer(customer: Customer) {
    return {
      fullName: customer.fullName,
      phone: customer.phone,
      address: customer.address ?? null,
      email: customer.email ?? null,
    };
  }

  private snapshotWorkshop(
    settings: WorkshopSettings,
  ): InvoiceWorkshopSnapshot {
    return {
      workshopName: settings.workshopName,
      commercialName: settings.commercialName ?? null,
      address: settings.address ?? null,
      phone: settings.phone ?? null,
      email: settings.email ?? null,
      taxNumber: settings.taxNumber ?? null,
      commercialRegister: settings.commercialRegister ?? null,
      logoPath: settings.logoPath ?? null,
      stampPath: settings.stampPath ?? null,
      invoiceFooter: settings.invoiceFooter ?? null,
    };
  }

  private optionalText(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }
}
