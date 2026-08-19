import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaymentMethod, PaymentStatus } from '../common/enums';
import { Order } from '../orders/entities/order.entity';
import { CreateCustomerNoteDto } from './dto/create-customer-note.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CustomerMeasurement } from './entities/customer-measurement.entity';
import { CustomerNote } from './entities/customer-note.entity';
import { Customer } from './entities/customer.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';

type PaginationPayload = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type InvoiceQueryResult = {
  invoices: Invoice[];
  pagination: PaginationPayload;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

@Injectable()
export class SalesService implements OnModuleInit {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemsRepository: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(CustomerMeasurement)
    private readonly measurementsRepository: Repository<CustomerMeasurement>,
    @InjectRepository(CustomerNote)
    private readonly notesRepository: Repository<CustomerNote>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seedSalesIfEmpty();
  }

  async createCustomer(dto: CreateCustomerDto) {
    const today = this.toDateKey(new Date());
    const firstVisitDate = dto.firstVisitDate ?? today;
    const customer = this.customersRepository.create({
      fullName: dto.fullName.trim(),
      phone: dto.phone.trim(),
      address: this.normalizeOptionalText(dto.address),
      email: this.normalizeOptionalText(dto.email),
      firstVisitDate,
      lastVisitDate: dto.lastVisitDate ?? firstVisitDate,
      totalPurchases: 0,
      totalPaid: 0,
      totalDebt: 0,
      notes: this.normalizeOptionalText(dto.notes),
    });

    return this.serializeCustomer(
      await this.customersRepository.save(customer),
    );
  }

  async findCustomers(query: CustomerFilterDto = {}) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const sortBy = query.sortBy ?? 'lastVisitDate';
    const sortOrder = query.sortOrder ?? 'DESC';
    const qb = this.customersRepository.createQueryBuilder('customer');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(customer.fullName LIKE :search OR customer.phone LIKE :search OR customer.email LIKE :search)',
        { search },
      );
    }

    if (query.phone?.trim()) {
      qb.andWhere('customer.phone LIKE :phone', {
        phone: `%${query.phone.trim()}%`,
      });
    }

    if (query.date) {
      qb.andWhere('customer.lastVisitDate = :date', { date: query.date });
    }

    qb.orderBy(`customer.${sortBy}`, sortOrder)
      .addOrderBy('customer.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [customers, total] = await qb.getManyAndCount();

    return this.buildListResponse(
      customers.map((customer) => this.serializeCustomer(customer)),
      this.buildPagination(page, limit, total),
    );
  }

  async findCustomerById(id: number) {
    return this.serializeCustomer(await this.findCustomerOrFail(id));
  }

  async updateCustomer(id: number, dto: UpdateCustomerDto) {
    const customer = await this.findCustomerOrFail(id);

    if (dto.fullName !== undefined) customer.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) customer.phone = dto.phone.trim();
    if (dto.address !== undefined) {
      customer.address = this.normalizeOptionalText(dto.address);
    }
    if (dto.email !== undefined) {
      customer.email = this.normalizeOptionalText(dto.email);
    }
    if (dto.firstVisitDate !== undefined) {
      customer.firstVisitDate = dto.firstVisitDate;
    }
    if (dto.lastVisitDate !== undefined) {
      customer.lastVisitDate = dto.lastVisitDate;
    }
    if (dto.notes !== undefined) {
      customer.notes = this.normalizeOptionalText(dto.notes);
    }

    return this.serializeCustomer(
      await this.customersRepository.save(customer),
    );
  }

  async deleteCustomer(id: number) {
    const customer = await this.findCustomerOrFail(id);
    await this.customersRepository.remove(customer);
    return { deleted: true, id };
  }

  async findAll(query: InvoiceFilterDto = {}) {
    const result = await this.queryInvoices(query, MAX_LIMIT);
    const invoiceCounts = await this.getCustomerInvoiceCounts(
      result.invoices.map((invoice) => invoice.customer.id),
    );

    return this.buildListResponse(
      result.invoices.map((invoice) =>
        this.serializeLegacyInvoice(
          invoice,
          invoiceCounts.get(invoice.customer.id) ?? 0,
        ),
      ),
      result.pagination,
    );
  }

  async createInvoice(dto: CreateInvoiceDto) {
    const invoiceId = await this.dataSource.transaction(async (manager) => {
      const customer = await this.findCustomerOrFail(dto.customerId, manager);
      const subtotal = this.calculateSubtotal(dto.items);
      const discount = this.roundMoney(dto.discount ?? 0);
      const totalAmount = this.calculateTotalAmount(subtotal, discount);
      const paidAmount = this.roundMoney(dto.paidAmount ?? 0);

      this.validateInvoiceAmounts(totalAmount, paidAmount, discount, subtotal);
      if (paidAmount > 0 && !dto.paymentMethod) {
        throw new BadRequestException(
          'paymentMethod is required when paidAmount is greater than zero',
        );
      }

      const invoices = manager.getRepository(Invoice);
      const invoice = invoices.create({
        invoiceNumber: await this.nextInvoiceNumber(manager),
        customer,
        date: dto.date ?? this.toDateKey(new Date()),
        subtotal,
        discount,
        totalAmount,
        paidAmount,
        remainingAmount: this.roundMoney(totalAmount - paidAmount),
        paymentStatus: this.resolvePaymentStatus(totalAmount, paidAmount),
        notes: this.normalizeOptionalText(dto.notes),
      });

      const savedInvoice = await invoices.save(invoice);
      await this.replaceInvoiceItems(manager, savedInvoice, dto.items);

      if (paidAmount > 0 && dto.paymentMethod) {
        await manager.getRepository(Payment).save(
          manager.getRepository(Payment).create({
            customer,
            invoice: savedInvoice,
            amount: paidAmount,
            paymentMethod: dto.paymentMethod,
            date: savedInvoice.date,
            notes: 'Initial invoice payment',
          }),
        );
      }

      await this.recalculateCustomer(manager, customer.id);
      return savedInvoice.id;
    });

    return this.findInvoiceById(invoiceId);
  }

  async findInvoices(query: InvoiceFilterDto = {}) {
    const result = await this.queryInvoices(query, DEFAULT_LIMIT);

    return this.buildListResponse(
      result.invoices.map((invoice) => this.serializeInvoice(invoice)),
      result.pagination,
    );
  }

  async findInvoiceById(id: number) {
    return this.serializeInvoice(await this.findInvoiceOrFail(id));
  }

  async updateInvoice(id: number, dto: UpdateInvoiceDto) {
    await this.dataSource.transaction(async (manager) => {
      const invoice = await this.findInvoiceOrFail(id, manager);
      const oldCustomerId = invoice.customer.id;
      const customer = dto.customerId
        ? await this.findCustomerOrFail(dto.customerId, manager)
        : invoice.customer;

      if (dto.items) {
        invoice.items = await this.replaceInvoiceItems(
          manager,
          invoice,
          dto.items,
        );
        invoice.subtotal = this.calculateSubtotal(dto.items);
      }

      if (dto.discount !== undefined) {
        invoice.discount = this.roundMoney(dto.discount);
      }

      invoice.totalAmount = this.calculateTotalAmount(
        invoice.subtotal,
        invoice.discount,
      );

      const recordedPayments = this.roundMoney(
        invoice.payments.reduce((sum, payment) => sum + payment.amount, 0),
      );
      const currentPaid = Math.max(recordedPayments, invoice.paidAmount);
      const requestedPaid = this.roundMoney(dto.paidAmount ?? currentPaid);

      if (requestedPaid < currentPaid) {
        throw new BadRequestException(
          'paidAmount cannot be reduced; payment history must remain immutable',
        );
      }

      this.validateInvoiceAmounts(
        invoice.totalAmount,
        requestedPaid,
        invoice.discount,
        invoice.subtotal,
      );

      if (requestedPaid > currentPaid) {
        if (!dto.paymentMethod) {
          throw new BadRequestException(
            'paymentMethod is required when increasing paidAmount',
          );
        }

        await manager.getRepository(Payment).save(
          manager.getRepository(Payment).create({
            customer,
            invoice,
            amount: this.roundMoney(requestedPaid - currentPaid),
            paymentMethod: dto.paymentMethod,
            date: dto.date ?? this.toDateKey(new Date()),
            notes: 'Payment recorded during invoice update',
          }),
        );
      }

      if (customer.id !== oldCustomerId && invoice.payments.length > 0) {
        for (const payment of invoice.payments) payment.customer = customer;
        await manager.getRepository(Payment).save(invoice.payments);
      }

      invoice.customer = customer;
      invoice.paidAmount = requestedPaid;
      invoice.remainingAmount = this.roundMoney(
        invoice.totalAmount - requestedPaid,
      );
      invoice.paymentStatus = this.resolvePaymentStatus(
        invoice.totalAmount,
        requestedPaid,
      );
      if (dto.date !== undefined) invoice.date = dto.date;
      if (dto.notes !== undefined) {
        invoice.notes = this.normalizeOptionalText(dto.notes);
      }

      await manager.getRepository(Invoice).save(invoice);
      await this.recalculateCustomer(manager, oldCustomerId);
      if (customer.id !== oldCustomerId) {
        await this.recalculateCustomer(manager, customer.id);
      }
    });

    return this.findInvoiceById(id);
  }

  async deleteInvoice(id: number) {
    await this.dataSource.transaction(async (manager) => {
      const invoice = await this.findInvoiceOrFail(id, manager);
      const customerId = invoice.customer.id;
      await manager.getRepository(Invoice).remove(invoice);
      await this.recalculateCustomer(manager, customerId);
    });

    return { deleted: true, id };
  }

  async createPayment(dto: CreatePaymentDto) {
    const paymentId = await this.dataSource.transaction(async (manager) => {
      const invoice = await this.findInvoiceOrFail(dto.invoiceId, manager);

      if (invoice.customer.id !== dto.customerId) {
        throw new BadRequestException(
          'customerId does not match the invoice customer',
        );
      }

      const amount = this.roundMoney(dto.amount);
      if (amount > invoice.remainingAmount) {
        throw new BadRequestException(
          `Payment exceeds remaining amount (${invoice.remainingAmount})`,
        );
      }

      const payments = manager.getRepository(Payment);
      const payment = await payments.save(
        payments.create({
          customer: invoice.customer,
          invoice,
          amount,
          paymentMethod: dto.paymentMethod,
          date: dto.date ?? this.toDateKey(new Date()),
          reference: this.normalizeOptionalText(dto.reference),
          notes: this.normalizeOptionalText(dto.notes),
        }),
      );

      invoice.paidAmount = this.roundMoney(invoice.paidAmount + amount);
      invoice.remainingAmount = this.roundMoney(
        invoice.totalAmount - invoice.paidAmount,
      );
      invoice.paymentStatus = this.resolvePaymentStatus(
        invoice.totalAmount,
        invoice.paidAmount,
      );
      await manager.getRepository(Invoice).save(invoice);
      await this.recalculateCustomer(manager, invoice.customer.id);

      return payment.id;
    });

    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: { customer: true, invoice: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    return {
      payment: this.serializePayment(payment),
      invoice: await this.findInvoiceById(dto.invoiceId),
    };
  }

  async getCustomerPayments(customerId: number) {
    await this.findCustomerOrFail(customerId);
    const payments = await this.paymentsRepository.find({
      where: { customer: { id: customerId } },
      relations: { customer: true, invoice: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
    return { data: payments.map((payment) => this.serializePayment(payment)) };
  }

  async createMeasurement(customerId: number, dto: CreateMeasurementDto) {
    if (dto.customerId !== undefined && dto.customerId !== customerId) {
      throw new BadRequestException(
        'customerId in the body does not match the route parameter',
      );
    }

    const customer = await this.findCustomerOrFail(customerId);
    const measurement = this.measurementsRepository.create({
      customer,
      type: dto.type.trim(),
      height: dto.height,
      shoulder: dto.shoulder,
      chest: dto.chest,
      waist: dto.waist,
      sleeve: dto.sleeve,
      pantsLength: dto.pantsLength,
      notes: this.normalizeOptionalText(dto.notes),
      date: dto.date ?? this.toDateKey(new Date()),
    });

    return this.serializeMeasurement(
      await this.measurementsRepository.save(measurement),
    );
  }

  async getCustomerMeasurements(customerId: number) {
    await this.findCustomerOrFail(customerId);
    const measurements = await this.measurementsRepository.find({
      where: { customer: { id: customerId } },
      order: { date: 'DESC', id: 'DESC' },
    });
    return {
      data: measurements.map((measurement) =>
        this.serializeMeasurement(measurement),
      ),
    };
  }

  async createCustomerNote(customerId: number, dto: CreateCustomerNoteDto) {
    const customer = await this.findCustomerOrFail(customerId);
    const note = this.notesRepository.create({
      customer,
      content: dto.content.trim(),
      date: dto.date ?? this.toDateKey(new Date()),
    });
    return this.serializeNote(await this.notesRepository.save(note));
  }

  async getCustomerNotes(customerId: number) {
    await this.findCustomerOrFail(customerId);
    const notes = await this.notesRepository.find({
      where: { customer: { id: customerId } },
      order: { date: 'DESC', id: 'DESC' },
    });
    return { data: notes.map((note) => this.serializeNote(note)) };
  }

  async getCustomerProfile(id: number) {
    const customer = await this.findCustomerOrFail(id);
    const [invoices, payments, measurements, notes, orders] = await Promise.all(
      [
        this.invoicesRepository.find({
          where: { customer: { id } },
          relations: {
            items: true,
            payments: true,
            customer: true,
            order: true,
          },
          order: { date: 'DESC', id: 'DESC' },
        }),
        this.paymentsRepository.find({
          where: { customer: { id } },
          relations: { customer: true, invoice: true },
          order: { date: 'DESC', id: 'DESC' },
        }),
        this.measurementsRepository.find({
          where: { customer: { id } },
          order: { date: 'DESC', id: 'DESC' },
        }),
        this.notesRepository.find({
          where: { customer: { id } },
          order: { date: 'DESC', id: 'DESC' },
        }),
        this.ordersRepository.find({
          where: { customer: { id } },
          order: { receivedDate: 'DESC', id: 'DESC' },
        }),
      ],
    );

    return {
      customer: this.serializeCustomer(customer),
      statistics: {
        totalInvoices: invoices.length,
        totalPurchases: customer.totalPurchases,
        totalPaid: customer.totalPaid,
        totalDebt: customer.totalDebt,
      },
      orders: orders.map((order) => this.serializeCustomerOrder(order)),
      invoices: invoices.map((invoice) => this.serializeInvoice(invoice)),
      payments: payments.map((payment) => this.serializePayment(payment)),
      measurements: measurements.map((measurement) =>
        this.serializeMeasurement(measurement),
      ),
      notes: notes.map((note) => this.serializeNote(note)),
    };
  }

  async getCustomerHistory(id: number) {
    await this.findCustomerOrFail(id);
    const [invoices, payments, measurements, notes, orders] = await Promise.all(
      [
        this.invoicesRepository.find({
          where: { customer: { id } },
          order: { date: 'DESC', id: 'DESC' },
        }),
        this.paymentsRepository.find({
          where: { customer: { id } },
          relations: { customer: true, invoice: true },
          order: { date: 'DESC', id: 'DESC' },
        }),
        this.measurementsRepository.find({
          where: { customer: { id } },
          order: { date: 'DESC', id: 'DESC' },
        }),
        this.notesRepository.find({
          where: { customer: { id } },
          order: { date: 'DESC', id: 'DESC' },
        }),
        this.ordersRepository.find({
          where: { customer: { id } },
          order: { receivedDate: 'DESC', id: 'DESC' },
        }),
      ],
    );

    const timeline = [
      ...invoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        type: 'INVOICE',
        date: invoice.date,
        title: `Facture ${invoice.invoiceNumber}`,
        label: '\u0641\u0627\u062a\u0648\u0631\u0629',
        amount: invoice.totalAmount,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      })),
      ...payments.map((payment) => ({
        id: `payment-${payment.id}`,
        type: 'PAYMENT',
        date: payment.date,
        title: 'Paiement',
        label: '\u062f\u0641\u0639\u0629',
        amount: payment.amount,
        invoiceId: payment.invoice?.id,
        invoiceNumber: payment.invoice?.invoiceNumber,
      })),
      ...measurements.map((measurement) => ({
        id: `measurement-${measurement.id}`,
        type: 'MEASUREMENT',
        date: measurement.date,
        title: `Mesures: ${measurement.type}`,
        label: '\u0642\u064a\u0627\u0633\u0627\u062a',
        measurementId: measurement.id,
      })),
      ...notes.map((note) => ({
        id: `note-${note.id}`,
        type: 'NOTE',
        date: note.date,
        title: note.content,
        label: '\u0645\u0644\u0627\u062d\u0638\u0629',
        noteId: note.id,
      })),
      ...orders.map((order) => ({
        id: `order-${order.id}`,
        type: 'ORDER',
        date: order.receivedDate,
        title: `Commande ${order.orderNumber}`,
        label: '\u0637\u0644\u0628\u064a\u0629',
        amount: order.finalPrice,
        orderId: order.id,
        orderNumber: order.orderNumber,
        productType: order.productType,
        status: order.status,
      })),
    ].sort((left, right) => {
      const dateOrder = right.date.localeCompare(left.date);
      return dateOrder || right.id.localeCompare(left.id);
    });

    return { timeline };
  }

  async getStats() {
    const today = this.toDateKey(new Date());
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = this.toDateKey(
      new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0),
    );

    const [todayRaw, monthRaw, unpaidInvoices, totalInvoices, debtRaw] =
      await Promise.all([
        this.invoicesRepository
          .createQueryBuilder('invoice')
          .select('COALESCE(SUM(invoice.totalAmount), 0)', 'total')
          .where('invoice.date = :today', { today })
          .getRawOne<{ total: number | string }>(),
        this.invoicesRepository
          .createQueryBuilder('invoice')
          .select('COALESCE(SUM(invoice.totalAmount), 0)', 'total')
          .where('invoice.date BETWEEN :start AND :end', {
            start: monthStart,
            end: monthEnd,
          })
          .getRawOne<{ total: number | string }>(),
        this.invoicesRepository
          .createQueryBuilder('invoice')
          .where('invoice.remainingAmount > 0')
          .getCount(),
        this.invoicesRepository.count(),
        this.invoicesRepository
          .createQueryBuilder('invoice')
          .select('COALESCE(SUM(invoice.remainingAmount), 0)', 'total')
          .getRawOne<{ total: number | string }>(),
      ]);

    return {
      todaySales: this.roundMoney(Number(todayRaw?.total ?? 0)),
      monthSales: this.roundMoney(Number(monthRaw?.total ?? 0)),
      unpaidInvoices,
      totalInvoices,
      totalDebt: this.roundMoney(Number(debtRaw?.total ?? 0)),
    };
  }

  private async queryInvoices(
    query: InvoiceFilterDto,
    defaultLimit: number,
  ): Promise<InvoiceQueryResult> {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit, defaultLimit);
    const qb = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.items', 'item')
      .leftJoinAndSelect('invoice.payments', 'payment')
      .leftJoinAndSelect('invoice.order', 'linkedOrder');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(invoice.invoiceNumber LIKE :search OR customer.fullName LIKE :search OR customer.phone LIKE :search)',
        { search },
      );
    }

    const status = query.paymentStatus ?? query.status;
    if (status) {
      qb.andWhere('invoice.paymentStatus = :status', { status });
    }

    if (query.customer?.trim()) {
      const customer = query.customer.trim();
      if (/^\d+$/.test(customer)) {
        qb.andWhere(
          '(customer.id = :customerId OR customer.fullName LIKE :customerName)',
          { customerId: Number(customer), customerName: `%${customer}%` },
        );
      } else {
        qb.andWhere('customer.fullName LIKE :customerName', {
          customerName: `%${customer}%`,
        });
      }
    }

    if (query.date) qb.andWhere('invoice.date = :date', { date: query.date });
    if (query.startDate) {
      qb.andWhere('invoice.date >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('invoice.date <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('invoice.date', 'DESC')
      .addOrderBy('invoice.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [invoices, total] = await qb.getManyAndCount();
    for (const invoice of invoices) {
      invoice.items.sort((a, b) => a.id - b.id);
      invoice.payments.sort((a, b) => a.date.localeCompare(b.date));
    }

    return {
      invoices,
      pagination: this.buildPagination(page, limit, total),
    };
  }

  private async findCustomerOrFail(id: number, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Customer)
      : this.customersRepository;
    const customer = await repository.findOne({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  private async findInvoiceOrFail(id: number, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Invoice)
      : this.invoicesRepository;
    const invoice = await repository.findOne({
      where: { id },
      relations: {
        customer: true,
        items: true,
        payments: true,
        order: true,
      },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  private async replaceInvoiceItems(
    manager: EntityManager,
    invoice: Invoice,
    items: CreateInvoiceDto['items'],
  ) {
    const repository = manager.getRepository(InvoiceItem);
    if (invoice.items?.length) await repository.remove(invoice.items);

    return repository.save(
      items.map((item) =>
        repository.create({
          invoice,
          description: item.description.trim(),
          productType: this.normalizeOptionalText(item.productType),
          quantity: item.quantity,
          unitPrice: this.roundMoney(item.unitPrice),
          total: this.roundMoney(item.quantity * item.unitPrice),
        }),
      ),
    );
  }

  private async nextInvoiceNumber(manager: EntityManager) {
    const lastInvoice = await manager.getRepository(Invoice).findOne({
      where: {},
      order: { id: 'DESC' },
      select: { invoiceNumber: true },
    });
    const match = lastInvoice?.invoiceNumber.match(/(\d+)$/);
    const nextNumber = Math.max(1024, Number(match?.[1] ?? 1023) + 1);
    return `#INV-${nextNumber}`;
  }

  private async recalculateCustomer(
    manager: EntityManager,
    customerId: number,
  ) {
    const customer = await manager.getRepository(Customer).findOne({
      where: { id: customerId },
    });
    if (!customer) return;

    const totals = await manager
      .getRepository(Invoice)
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.totalAmount), 0)', 'purchases')
      .addSelect('COALESCE(SUM(invoice.paidAmount), 0)', 'paid')
      .addSelect('COALESCE(SUM(invoice.remainingAmount), 0)', 'debt')
      .addSelect('MIN(invoice.date)', 'firstVisit')
      .addSelect('MAX(invoice.date)', 'lastVisit')
      .where('invoice.customerId = :customerId', { customerId })
      .getRawOne<{
        purchases: number | string;
        paid: number | string;
        debt: number | string;
        firstVisit: string | null;
        lastVisit: string | null;
      }>();

    customer.totalPurchases = this.roundMoney(Number(totals?.purchases ?? 0));
    customer.totalPaid = this.roundMoney(Number(totals?.paid ?? 0));
    customer.totalDebt = this.roundMoney(Number(totals?.debt ?? 0));
    if (totals?.firstVisit) customer.firstVisitDate = totals.firstVisit;
    if (totals?.lastVisit) customer.lastVisitDate = totals.lastVisit;
    await manager.getRepository(Customer).save(customer);
  }

  private async getCustomerInvoiceCounts(customerIds: number[]) {
    const uniqueIds = [...new Set(customerIds)];
    const counts = new Map<number, number>();
    if (uniqueIds.length === 0) return counts;

    const rows = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('invoice.customerId', 'customerId')
      .addSelect('COUNT(invoice.id)', 'total')
      .where('invoice.customerId IN (:...customerIds)', {
        customerIds: uniqueIds,
      })
      .groupBy('invoice.customerId')
      .getRawMany<{ customerId: number | string; total: number | string }>();

    for (const row of rows)
      counts.set(Number(row.customerId), Number(row.total));
    return counts;
  }

  private calculateSubtotal(items: CreateInvoiceDto['items']) {
    return this.roundMoney(
      items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    );
  }

  private calculateTotalAmount(subtotal: number, discount: number) {
    if (discount > subtotal) {
      throw new BadRequestException('Discount cannot exceed subtotal');
    }
    return this.roundMoney(subtotal - discount);
  }

  private validateInvoiceAmounts(
    totalAmount: number,
    paidAmount: number,
    discount: number,
    subtotal: number,
  ) {
    if (discount > subtotal) {
      throw new BadRequestException('Discount cannot exceed subtotal');
    }
    if (paidAmount > totalAmount) {
      throw new BadRequestException('paidAmount cannot exceed totalAmount');
    }
  }

  private resolvePaymentStatus(totalAmount: number, paidAmount: number) {
    if (totalAmount <= 0 || paidAmount >= totalAmount)
      return PaymentStatus.PAID;
    if (paidAmount > 0) return PaymentStatus.PARTIALLY_PAID;
    return PaymentStatus.UNPAID;
  }

  private paymentStatusCode(status: PaymentStatus) {
    if (status === PaymentStatus.PAID) return 'PAID';
    if (status === PaymentStatus.PARTIALLY_PAID) return 'PARTIAL';
    return 'UNPAID';
  }

  private paymentMethodCode(method: PaymentMethod) {
    const entry = Object.entries(PaymentMethod).find(
      ([, value]) => value === method,
    );
    return entry?.[0] ?? 'CASH';
  }

  private serializeCustomer(customer: Customer) {
    return {
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      address: customer.address ?? null,
      email: customer.email ?? null,
      firstVisitDate: customer.firstVisitDate,
      lastVisitDate: customer.lastVisitDate,
      lastVisit: customer.lastVisitDate,
      totalPurchases: customer.totalPurchases,
      totalPaid: customer.totalPaid,
      totalDebt: customer.totalDebt,
      notes: customer.notes ?? null,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  private serializeInvoice(invoice: Invoice) {
    const statusCode = this.paymentStatusCode(invoice.paymentStatus);
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      number: invoice.invoiceNumber,
      customerId: invoice.customer.id,
      customer: invoice.customer.fullName,
      customerName: invoice.customer.fullName,
      customerPhone: invoice.customer.phone,
      orderId: invoice.order?.id ?? null,
      date: invoice.date,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      totalAmount: invoice.totalAmount,
      total: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      paid: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
      remaining: invoice.remainingAmount,
      paymentStatus: invoice.paymentStatus,
      paymentStatusCode: statusCode,
      status: invoice.paymentStatus,
      statusCode,
      notes: invoice.notes ?? null,
      items: (invoice.items ?? []).map((item) =>
        this.serializeInvoiceItem(item),
      ),
      payments: (invoice.payments ?? []).map((payment) =>
        this.serializePayment(
          payment,
          invoice.customer.id,
          invoice.id,
          invoice.invoiceNumber,
        ),
      ),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  private serializeLegacyInvoice(invoice: Invoice, totalInvoices: number) {
    const status = this.paymentStatusCode(invoice.paymentStatus).toLowerCase();
    return {
      ...this.serializeInvoice(invoice),
      status,
      customerDebtTotalInvoices: totalInvoices,
      customerDebtTotalAmount: invoice.customer.totalPurchases,
      customerDebtRemainingAmount: invoice.customer.totalDebt,
      customerDebtLastPurchase: invoice.customer.lastVisitDate,
    };
  }

  private serializeInvoiceItem(item: InvoiceItem) {
    return {
      id: item.id,
      description: item.description,
      productType: item.productType ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      createdAt: item.createdAt,
    };
  }

  private serializePayment(
    payment: Payment,
    customerId?: number,
    invoiceId?: number,
    invoiceNumber?: string,
  ) {
    const method = this.paymentMethodCode(payment.paymentMethod);
    return {
      id: payment.id,
      customerId: payment.customer?.id ?? customerId,
      invoiceId: payment.invoice?.id ?? invoiceId,
      invoiceNumber: payment.invoice?.invoiceNumber ?? invoiceNumber,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentMethodCode: method,
      method,
      date: payment.date,
      reference: payment.reference ?? null,
      notes: payment.notes ?? null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private serializeMeasurement(measurement: CustomerMeasurement) {
    return {
      id: measurement.id,
      type: measurement.type,
      height: measurement.height ?? null,
      shoulder: measurement.shoulder ?? null,
      chest: measurement.chest ?? null,
      waist: measurement.waist ?? null,
      sleeve: measurement.sleeve ?? null,
      pantsLength: measurement.pantsLength ?? null,
      notes: measurement.notes ?? null,
      date: measurement.date,
    };
  }

  private serializeNote(note: CustomerNote) {
    return { id: note.id, content: note.content, date: note.date };
  }

  private serializeCustomerOrder(order: Order) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      productType: order.productType,
      quantity: order.quantity,
      status: order.status,
      priority: order.priority,
      receivedDate: order.receivedDate,
      deliveryDate: order.deliveryDate ?? null,
      productionCost: order.estimatedCost,
      finalPrice: order.finalPrice,
    };
  }

  private async seedSalesIfEmpty() {
    if ((await this.customersRepository.count()) > 0) return;

    await this.dataSource.transaction(async (manager) => {
      const today = new Date();
      const todayKey = this.toDateKey(today);
      const previousDate = this.toDateKey(this.shiftDate(today, -5));
      const customers = manager.getRepository(Customer);
      const invoices = manager.getRepository(Invoice);
      const items = manager.getRepository(InvoiceItem);
      const payments = manager.getRepository(Payment);

      const [souad, mohamed, fatima] = await customers.save([
        customers.create({
          fullName: '\u0633\u0639\u0627\u062f \u0645\u0631\u0632\u0648\u0642',
          phone: '0780000000',
          address: '\u0627\u0644\u062c\u0632\u0627\u0626\u0631',
          firstVisitDate: previousDate,
          lastVisitDate: todayKey,
          totalPurchases: 0,
          totalPaid: 0,
          totalDebt: 0,
          notes: '\u0632\u0628\u0648\u0646 \u0646\u0634\u0637',
        }),
        customers.create({
          fullName: '\u0645\u062d\u0645\u062f \u0639\u0644\u064a',
          phone: '0770000000',
          firstVisitDate: previousDate,
          lastVisitDate: previousDate,
          totalPurchases: 0,
          totalPaid: 0,
          totalDebt: 0,
        }),
        customers.create({
          fullName:
            '\u0641\u0627\u0637\u0645\u0629 \u0627\u0644\u0632\u0647\u0631\u0627\u0621',
          phone: '0550000000',
          firstVisitDate: todayKey,
          lastVisitDate: todayKey,
          totalPurchases: 0,
          totalPaid: 0,
          totalDebt: 0,
        }),
      ]);

      const firstInvoice = await invoices.save(
        invoices.create({
          invoiceNumber: '#INV-1024',
          customer: souad,
          date: todayKey,
          subtotal: 9800,
          discount: 0,
          totalAmount: 9800,
          paidAmount: 4000,
          remainingAmount: 5800,
          paymentStatus: PaymentStatus.PARTIALLY_PAID,
          notes:
            '\u0641\u0627\u062a\u0648\u0631\u0629 \u062a\u062c\u0631\u064a\u0628\u064a\u0629',
        }),
      );
      const secondInvoice = await invoices.save(
        invoices.create({
          invoiceNumber: '#INV-1025',
          customer: mohamed,
          date: previousDate,
          subtotal: 40000,
          discount: 0,
          totalAmount: 40000,
          paidAmount: 20000,
          remainingAmount: 20000,
          paymentStatus: PaymentStatus.PARTIALLY_PAID,
        }),
      );

      await items.save([
        items.create({
          invoice: firstInvoice,
          description:
            '\u0642\u0645\u064a\u0635 \u0631\u062c\u0627\u0644\u064a',
          productType: '\u0642\u0645\u064a\u0635',
          quantity: 2,
          unitPrice: 4900,
          total: 9800,
        }),
        items.create({
          invoice: secondInvoice,
          description: '\u0628\u062f\u0644\u0629 \u0639\u0645\u0644',
          productType: '\u0628\u062f\u0644\u0629',
          quantity: 4,
          unitPrice: 10000,
          total: 40000,
        }),
      ]);

      await payments.save([
        payments.create({
          customer: souad,
          invoice: firstInvoice,
          amount: 4000,
          paymentMethod: PaymentMethod.CASH,
          date: todayKey,
          reference: 'SEED-1024',
        }),
        payments.create({
          customer: mohamed,
          invoice: secondInvoice,
          amount: 5000,
          paymentMethod: PaymentMethod.CASH,
          date: previousDate,
          reference: 'SEED-1025-A',
        }),
        payments.create({
          customer: mohamed,
          invoice: secondInvoice,
          amount: 15000,
          paymentMethod: PaymentMethod.TRANSFER,
          date: todayKey,
          reference: 'SEED-1025-B',
        }),
      ]);

      await manager.getRepository(CustomerMeasurement).save(
        manager.getRepository(CustomerMeasurement).create({
          customer: souad,
          type: '\u0628\u062f\u0644\u0629 \u0639\u0645\u0644',
          height: 168,
          shoulder: 42,
          chest: 96,
          waist: 82,
          sleeve: 59,
          pantsLength: 101,
          date: todayKey,
        }),
      );

      await manager.getRepository(CustomerNote).save(
        manager.getRepository(CustomerNote).create({
          customer: fatima,
          content:
            '\u062a\u0641\u0636\u0644 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0642\u0628\u0644 \u0627\u0644\u062a\u0633\u0644\u064a\u0645',
          date: todayKey,
        }),
      );

      await this.recalculateCustomer(manager, souad.id);
      await this.recalculateCustomer(manager, mohamed.id);
      await this.recalculateCustomer(manager, fatima.id);
    });
  }

  private normalizeOptionalText(value?: string) {
    const normalized = value?.trim();
    return normalized || undefined;
  }

  private normalizePage(value?: number) {
    return Math.max(DEFAULT_PAGE, Math.floor(value ?? DEFAULT_PAGE));
  }

  private normalizeLimit(value?: number, fallback = DEFAULT_LIMIT) {
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(value ?? fallback)));
  }

  private buildPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  private buildListResponse<T>(data: T[], pagination: PaginationPayload) {
    return { data, pagination };
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private shiftDate(date: Date, days: number) {
    const shifted = new Date(date);
    shifted.setDate(shifted.getDate() + days);
    return shifted;
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
