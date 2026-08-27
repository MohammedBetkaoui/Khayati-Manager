import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import {
  CustomerStatus,
  CustomerType,
  DiscountType,
  FinishedProductStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStockMovementType,
} from '../common/enums';
import { FinishedProduct } from '../inventory/entities/finished-product.entity';
import { ProductStockMovement } from '../inventory/entities/product-stock-movement.entity';
import { ProductVariant } from '../inventory/entities/product-variant.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { InvoiceNumberService } from '../invoices/invoice-number.service';
import { WorkshopSettings } from '../settings/entities/workshop-settings.entity';
import { CreateCustomerNoteDto } from './dto/create-customer-note.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  CreateInvoiceDto,
  CreateInvoiceItemDto,
} from './dto/create-invoice.dto';
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

type PreparedSaleItem = {
  product: FinishedProduct;
  variant: ProductVariant;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
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
    @InjectRepository(FinishedProduct)
    private readonly productsRepository: Repository<FinishedProduct>,
    private readonly dataSource: DataSource,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly invoicePaymentsService: InvoicesService,
  ) {}

  async onModuleInit() {
    await this.recalculateAllCustomers();
  }

  async createCustomer(dto: CreateCustomerDto) {
    const phone = dto.phone.trim();
    const duplicate = await this.customersRepository.findOne({
      where: { phone },
    });
    if (duplicate && duplicate.status !== CustomerStatus.ARCHIVED) {
      throw new ConflictException(
        `A customer with phone ${phone} already exists`,
      );
    }

    const today = this.toDateKey(new Date());
    const firstVisitDate = dto.firstVisitDate ?? today;
    const customer = await this.customersRepository.save(
      this.customersRepository.create({
        fullName: dto.fullName.trim(),
        phone,
        secondPhone: this.optionalText(dto.secondPhone),
        address: this.optionalText(dto.address),
        email: this.optionalText(dto.email),
        city: this.optionalText(dto.city),
        wilaya: this.optionalText(dto.wilaya),
        type: dto.type ?? CustomerType.REGULAR,
        status: dto.status ?? CustomerStatus.ACTIVE,
        firstVisitDate,
        lastVisitDate: dto.lastVisitDate ?? firstVisitDate,
        totalPurchases: 0,
        totalPaid: 0,
        totalDebt: 0,
        notes: this.optionalText(dto.notes),
        archivedAt: null,
      }),
    );
    return this.serializeCustomer(customer, 0);
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
        '(customer.fullName LIKE :search OR customer.phone LIKE :search OR customer.secondPhone LIKE :search OR customer.email LIKE :search OR customer.address LIKE :search OR customer.city LIKE :search OR customer.wilaya LIKE :search)',
        { search },
      );
    }
    if (query.phone?.trim()) {
      qb.andWhere(
        '(customer.phone LIKE :phone OR customer.secondPhone LIKE :phone)',
        { phone: `%${query.phone.trim()}%` },
      );
    }
    if (query.date) {
      qb.andWhere('customer.lastVisitDate = :date', { date: query.date });
    }
    if (query.type) qb.andWhere('customer.type = :type', { type: query.type });
    if (query.status) {
      qb.andWhere('customer.status = :status', { status: query.status });
    } else {
      qb.andWhere('customer.status != :archivedStatus', {
        archivedStatus: CustomerStatus.ARCHIVED,
      });
    }

    qb.orderBy(`customer.${sortBy}`, sortOrder)
      .addOrderBy('customer.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [customers, total] = await qb.getManyAndCount();
    const counts = await this.getCustomerInvoiceCounts(
      customers.map((customer) => customer.id),
    );
    return {
      data: customers.map((customer) =>
        this.serializeCustomer(customer, counts.get(customer.id) ?? 0),
      ),
      pagination: this.pagination(page, limit, total),
    };
  }

  async getCustomerStats() {
    const [totalCustomers, activeCustomers, importantCustomers, debt] =
      await Promise.all([
        this.customersRepository.count({
          where: { status: Not(CustomerStatus.ARCHIVED) },
        }),
        this.customersRepository.count({
          where: { status: CustomerStatus.ACTIVE },
        }),
        this.customersRepository.count({
          where: {
            type: CustomerType.VIP,
            status: Not(CustomerStatus.ARCHIVED),
          },
        }),
        this.customersRepository
          .createQueryBuilder('customer')
          .select('COUNT(customer.id)', 'customersWithDebt')
          .addSelect('COALESCE(SUM(customer.totalDebt), 0)', 'totalDebt')
          .where('customer.totalDebt > 0')
          .andWhere('customer.status != :archivedStatus', {
            archivedStatus: CustomerStatus.ARCHIVED,
          })
          .getRawOne<Record<string, number | string>>(),
      ]);
    return {
      totalCustomers,
      activeCustomers,
      importantCustomers,
      customersWithDebt: Number(debt?.customersWithDebt ?? 0),
      totalDebt: this.roundMoney(Number(debt?.totalDebt ?? 0)),
    };
  }

  async findCustomerById(id: number) {
    const customer = await this.findCustomerOrFail(id);
    const counts = await this.getCustomerInvoiceCounts([id]);
    return this.serializeCustomer(customer, counts.get(id) ?? 0);
  }

  async updateCustomer(id: number, dto: UpdateCustomerDto) {
    const customer = await this.findCustomerOrFail(id);
    if (dto.phone !== undefined && dto.phone.trim() !== customer.phone) {
      const duplicate = await this.customersRepository.findOne({
        where: { phone: dto.phone.trim() },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          `A customer with phone ${dto.phone.trim()} already exists`,
        );
      }
    }

    if (dto.fullName !== undefined) customer.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) customer.phone = dto.phone.trim();
    if (dto.secondPhone !== undefined)
      customer.secondPhone = this.optionalText(dto.secondPhone);
    if (dto.address !== undefined)
      customer.address = this.optionalText(dto.address);
    if (dto.email !== undefined) customer.email = this.optionalText(dto.email);
    if (dto.city !== undefined) customer.city = this.optionalText(dto.city);
    if (dto.wilaya !== undefined)
      customer.wilaya = this.optionalText(dto.wilaya);
    if (dto.type !== undefined) customer.type = dto.type;
    if (dto.status !== undefined) {
      customer.status = dto.status;
      customer.archivedAt =
        dto.status === CustomerStatus.ARCHIVED ? new Date() : null;
    }
    if (dto.firstVisitDate !== undefined)
      customer.firstVisitDate = dto.firstVisitDate;
    if (dto.lastVisitDate !== undefined)
      customer.lastVisitDate = dto.lastVisitDate;
    if (dto.notes !== undefined) customer.notes = this.optionalText(dto.notes);
    await this.customersRepository.save(customer);
    return this.findCustomerById(id);
  }

  async archiveCustomer(id: number) {
    const customer = await this.findCustomerOrFail(id);
    if (customer.status !== CustomerStatus.ARCHIVED) {
      customer.status = CustomerStatus.ARCHIVED;
      customer.archivedAt = new Date();
      await this.customersRepository.save(customer);
    }
    return this.findCustomerById(id);
  }

  async restoreCustomer(id: number) {
    const customer = await this.findCustomerOrFail(id);
    if (customer.status !== CustomerStatus.ARCHIVED) {
      return this.findCustomerById(id);
    }

    const duplicate = await this.customersRepository
      .createQueryBuilder('customer')
      .where('customer.phone = :phone', { phone: customer.phone })
      .andWhere('customer.id != :id', { id })
      .andWhere('customer.status != :archivedStatus', {
        archivedStatus: CustomerStatus.ARCHIVED,
      })
      .getOne();
    if (duplicate) {
      throw new ConflictException(
        `Cannot restore this customer because phone ${customer.phone} is already used by an active customer`,
      );
    }

    customer.status = CustomerStatus.ACTIVE;
    customer.archivedAt = null;
    await this.customersRepository.save(customer);
    return this.findCustomerById(id);
  }

  async deleteCustomer(id: number) {
    const customer = await this.archiveCustomer(id);
    return { archived: true, customer };
  }

  async findAll(query: InvoiceFilterDto = {}) {
    const result = await this.queryInvoices(query, MAX_LIMIT);
    const invoiceCounts = await this.getCustomerInvoiceCounts(
      result.invoices.map((invoice) => invoice.customer.id),
    );
    return {
      data: result.invoices.map((invoice) => ({
        ...this.serializeInvoice(invoice),
        status: this.paymentStatusCode(invoice.paymentStatus).toLowerCase(),
        customerDebtTotalInvoices: invoiceCounts.get(invoice.customer.id) ?? 0,
        customerDebtTotalAmount: invoice.customer.totalPurchases,
        customerDebtRemainingAmount: invoice.customer.totalDebt,
        customerDebtLastPurchase: invoice.customer.lastVisitDate,
      })),
      pagination: result.pagination,
    };
  }

  async createInvoice(dto: CreateInvoiceDto) {
    const invoiceId = await this.dataSource.transaction(async (manager) => {
      const customer = await this.findCustomerOrFail(dto.customerId, manager);
      this.ensureCustomerCanBuy(customer);
      const preparedItems = await this.prepareSaleItems(manager, dto.items);
      const subtotal = this.roundMoney(
        preparedItems.reduce((sum, item) => sum + item.total, 0),
      );
      const discount = this.roundMoney(dto.discount ?? 0);
      const amountAfterDiscount = this.calculateTotalAmount(subtotal, discount);
      const settings = await manager.getRepository(WorkshopSettings).findOne({
        where: {},
        order: { id: 'ASC' },
      });
      const taxEnabled = dto.taxEnabled ?? settings?.defaultTaxEnabled ?? false;
      const taxRate = taxEnabled
        ? (dto.taxRate ?? settings?.defaultTaxRate ?? 0)
        : 0;
      const taxAmount = this.roundMoney(
        taxEnabled ? (amountAfterDiscount * taxRate) / 100 : 0,
      );
      const totalAmount = this.roundMoney(amountAfterDiscount + taxAmount);
      const paidAmount = this.roundMoney(dto.paidAmount ?? 0);
      this.validateInvoiceAmounts(totalAmount, paidAmount, discount, subtotal);
      if (paidAmount > 0 && !dto.paymentMethod) {
        throw new BadRequestException(
          'paymentMethod is required when paidAmount is greater than zero',
        );
      }

      const issueDate = dto.date ?? this.toDateKey(new Date());
      const invoice = await manager.getRepository(Invoice).save(
        manager.getRepository(Invoice).create({
          invoiceNumber: await this.invoiceNumberService.next(
            manager,
            issueDate,
          ),
          customer,
          customerSnapshot: {
            fullName: customer.fullName,
            phone: customer.phone,
            address: customer.address ?? null,
            email: customer.email ?? null,
          },
          workshopSnapshot: settings
            ? {
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
              }
            : null,
          date: issueDate,
          dueDate: dto.dueDate ?? null,
          subtotal,
          discount,
          discountType: discount > 0 ? DiscountType.FIXED : DiscountType.NONE,
          discountValue: discount,
          discountAmount: discount,
          taxEnabled,
          taxRate,
          taxAmount,
          totalAmount,
          paidAmount,
          remainingAmount: this.roundMoney(totalAmount - paidAmount),
          paymentStatus: this.resolvePaymentStatus(totalAmount, paidAmount),
          invoiceStatus: InvoiceStatus.ISSUED,
          currency: settings?.defaultCurrency ?? 'DZD',
          notes: this.optionalText(dto.notes),
        }),
      );

      await this.saveSaleItems(manager, invoice, preparedItems);
      await this.applySaleStock(manager, invoice, preparedItems);

      if (paidAmount > 0 && dto.paymentMethod) {
        await manager.getRepository(Payment).save(
          manager.getRepository(Payment).create({
            customer,
            invoice,
            amount: paidAmount,
            paymentMethod: dto.paymentMethod,
            date: invoice.date,
            reference: this.optionalText(dto.paymentReference),
            notes: 'Initial sale payment',
          }),
        );
      }
      await this.recalculateCustomer(manager, customer.id);
      return invoice.id;
    });
    return this.findInvoiceById(invoiceId);
  }

  async findInvoices(query: InvoiceFilterDto = {}) {
    const result = await this.queryInvoices(query, DEFAULT_LIMIT);
    return {
      data: result.invoices.map((invoice) => this.serializeInvoice(invoice)),
      pagination: result.pagination,
    };
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
      this.ensureCustomerCanBuy(customer);

      if (dto.items) {
        await this.restoreInvoiceStock(
          manager,
          invoice,
          'Sale update stock reversal',
        );
        await manager.getRepository(InvoiceItem).remove(invoice.items);
        const preparedItems = await this.prepareSaleItems(manager, dto.items);
        invoice.items = await this.saveSaleItems(
          manager,
          invoice,
          preparedItems,
        );
        await this.applySaleStock(manager, invoice, preparedItems);
        invoice.subtotal = this.roundMoney(
          preparedItems.reduce((sum, item) => sum + item.total, 0),
        );
      }

      if (dto.discount !== undefined)
        invoice.discount = this.roundMoney(dto.discount);
      invoice.discountType =
        invoice.discount > 0 ? DiscountType.FIXED : DiscountType.NONE;
      invoice.discountValue = invoice.discount;
      invoice.discountAmount = invoice.discount;
      const amountAfterDiscount = this.calculateTotalAmount(
        invoice.subtotal,
        invoice.discount,
      );
      if (dto.taxEnabled !== undefined) invoice.taxEnabled = dto.taxEnabled;
      if (dto.taxRate !== undefined) invoice.taxRate = dto.taxRate;
      if (!invoice.taxEnabled) invoice.taxRate = 0;
      invoice.taxAmount = this.roundMoney(
        invoice.taxEnabled ? (amountAfterDiscount * invoice.taxRate) / 100 : 0,
      );
      invoice.totalAmount = this.roundMoney(
        amountAfterDiscount + invoice.taxAmount,
      );

      const recordedPayments = this.roundMoney(
        invoice.payments.reduce((sum, payment) => sum + payment.amount, 0),
      );
      const currentPaid = Math.max(recordedPayments, invoice.paidAmount);
      const requestedPaid = this.roundMoney(dto.paidAmount ?? currentPaid);
      if (requestedPaid < currentPaid) {
        throw new BadRequestException(
          'paidAmount cannot be reduced; payment history is immutable',
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
            reference: this.optionalText(dto.paymentReference),
            notes: 'Payment recorded during sale update',
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
      if (dto.dueDate !== undefined) invoice.dueDate = dto.dueDate;
      if (dto.notes !== undefined) invoice.notes = this.optionalText(dto.notes);
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
      if (invoice.payments.length > 0 || invoice.paidAmount > 0) {
        throw new BadRequestException(
          'A paid sale cannot be deleted; preserve its financial history',
        );
      }
      const customerId = invoice.customer.id;
      await this.restoreInvoiceStock(
        manager,
        invoice,
        'Deleted sale stock restoration',
      );
      await manager.getRepository(Invoice).remove(invoice);
      await this.recalculateCustomer(manager, customerId);
    });
    return { deleted: true, id };
  }

  async createPayment(dto: CreatePaymentDto) {
    const result = await this.invoicePaymentsService.addPayment(
      dto.invoiceId,
      {
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        paymentDate: dto.date,
        reference: dto.reference,
        notes: dto.notes,
      },
      dto.customerId,
    );
    return {
      payment: this.serializePayment(result.payment),
      invoice: this.serializeInvoice(result.invoice),
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
    const measurement = await this.measurementsRepository.save(
      this.measurementsRepository.create({
        customer,
        type: dto.type.trim(),
        height: dto.height,
        shoulder: dto.shoulder,
        chest: dto.chest,
        waist: dto.waist,
        sleeve: dto.sleeve,
        pantsLength: dto.pantsLength,
        notes: this.optionalText(dto.notes),
        date: dto.date ?? this.toDateKey(new Date()),
      }),
    );
    return this.serializeMeasurement(measurement);
  }

  async getCustomerMeasurements(customerId: number) {
    await this.findCustomerOrFail(customerId);
    const measurements = await this.measurementsRepository.find({
      where: { customer: { id: customerId } },
      order: { date: 'DESC', id: 'DESC' },
    });
    return {
      data: measurements.map((item) => this.serializeMeasurement(item)),
    };
  }

  async createCustomerNote(customerId: number, dto: CreateCustomerNoteDto) {
    const customer = await this.findCustomerOrFail(customerId);
    const note = await this.notesRepository.save(
      this.notesRepository.create({
        customer,
        content: dto.content.trim(),
        date: dto.date ?? this.toDateKey(new Date()),
      }),
    );
    return this.serializeNote(note);
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
    const [invoices, payments, measurements, notes] = await Promise.all([
      this.invoicesRepository.find({
        where: { customer: { id } },
        relations: {
          items: { product: true, variant: true },
          payments: true,
          customer: true,
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
    ]);

    const totalInvoices = invoices.length;
    const averageSale = totalInvoices
      ? this.roundMoney(
          invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0) /
            totalInvoices,
        )
      : 0;
    const purchaseTrend = this.buildPurchaseTrend(invoices);
    const topProducts = this.buildTopProducts(invoices);
    const frequency = this.calculatePurchaseFrequency(invoices);
    const debtInvoices = invoices.filter(
      (invoice) => invoice.remainingAmount > 0,
    );

    return {
      customer: this.serializeCustomer(customer, totalInvoices),
      statistics: {
        totalInvoices,
        totalSales: totalInvoices,
        totalPurchases: customer.totalPurchases,
        totalPaid: customer.totalPaid,
        totalDebt: customer.totalDebt,
        averageSale,
        lastPurchase: invoices[0]?.date ?? null,
        purchaseFrequencyDays: frequency,
      },
      invoices: invoices.map((invoice) => this.serializeInvoice(invoice)),
      payments: payments.map((payment) => this.serializePayment(payment)),
      debts: debtInvoices.map((invoice) => ({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        dueDate: invoice.dueDate ?? null,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        remainingAmount: invoice.remainingAmount,
        paymentStatusCode: this.paymentStatusCode(invoice.paymentStatus),
      })),
      analytics: {
        purchaseTrend,
        topProducts,
        purchaseFrequencyDays: frequency,
        lastActivity:
          payments[0]?.date ?? invoices[0]?.date ?? customer.lastVisitDate,
      },
      measurements: measurements.map((item) => this.serializeMeasurement(item)),
      notes: notes.map((note) => this.serializeNote(note)),
    };
  }

  async getCustomerHistory(id: number) {
    const profile = await this.getCustomerProfile(id);
    const timeline = [
      ...profile.invoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        type: 'SALE',
        date: invoice.date,
        title: `Vente ${invoice.invoiceNumber}`,
        amount: invoice.totalAmount,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      })),
      ...profile.payments.map((payment) => ({
        id: `payment-${payment.id}`,
        type: 'PAYMENT',
        date: payment.date,
        title: 'Paiement',
        amount: payment.amount,
        invoiceId: payment.invoiceId,
        invoiceNumber: payment.invoiceNumber,
      })),
      ...profile.measurements.map((measurement) => ({
        id: `measurement-${measurement.id}`,
        type: 'MEASUREMENT',
        date: measurement.date,
        title: `Mesures: ${measurement.type}`,
      })),
      ...profile.notes.map((note) => ({
        id: `note-${note.id}`,
        type: 'NOTE',
        date: note.date,
        title: note.content,
      })),
    ].sort((left, right) => right.date.localeCompare(left.date));
    return { timeline };
  }

  async getStats() {
    const today = this.toDateKey(new Date());
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = this.toDateKey(
      new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0),
    );
    const [todayRaw, monthRaw, unpaidInvoices, totalInvoices, debtRaw, avgRaw] =
      await Promise.all([
        this.sumInvoiceFieldForRange('totalAmount', today, today),
        this.sumInvoiceFieldForRange('totalAmount', monthStart, monthEnd),
        this.invoicesRepository
          .createQueryBuilder('invoice')
          .where('invoice.remainingAmount > 0')
          .getCount(),
        this.invoicesRepository.count(),
        this.invoicesRepository
          .createQueryBuilder('invoice')
          .select('COALESCE(SUM(invoice.remainingAmount), 0)', 'total')
          .getRawOne<{ total: number | string }>(),
        this.invoicesRepository
          .createQueryBuilder('invoice')
          .select('COALESCE(AVG(invoice.totalAmount), 0)', 'average')
          .getRawOne<{ average: number | string }>(),
      ]);
    return {
      todaySales: this.roundMoney(Number(todayRaw?.total ?? 0)),
      monthSales: this.roundMoney(Number(monthRaw?.total ?? 0)),
      unpaidInvoices,
      totalInvoices,
      totalDebt: this.roundMoney(Number(debtRaw?.total ?? 0)),
      averageSale: this.roundMoney(Number(avgRaw?.average ?? 0)),
    };
  }

  private async prepareSaleItems(
    manager: EntityManager,
    items: CreateInvoiceItemDto[],
  ) {
    const prepared: PreparedSaleItem[] = [];
    const variantIds = new Set<number>();

    for (const item of items) {
      const product = await manager.getRepository(FinishedProduct).findOne({
        where: { id: item.productId },
        relations: { variants: true },
      });
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
      if (product.status !== FinishedProductStatus.ACTIVE) {
        throw new BadRequestException(
          `${product.name} is not available for sale`,
        );
      }

      const activeVariants = product.variants.filter(
        (variant) => variant.active,
      );
      const variant = item.variantId
        ? activeVariants.find((entry) => entry.id === item.variantId)
        : activeVariants.length === 1
          ? activeVariants[0]
          : undefined;
      if (!variant) {
        throw new BadRequestException(
          `A valid variant is required for ${product.name}`,
        );
      }
      if (variantIds.has(variant.id)) {
        throw new BadRequestException(
          `Variant ${variant.sku} appears more than once in the cart`,
        );
      }
      variantIds.add(variant.id);
      if (item.quantity > variant.quantityAvailable) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name} (${this.variantLabel(variant)}). Available: ${variant.quantityAvailable}`,
        );
      }

      const unitPrice = this.roundMoney(
        item.unitPrice ?? variant.salePrice ?? product.salePrice,
      );
      prepared.push({
        product,
        variant,
        description:
          this.optionalText(item.description) ??
          `${product.name} - ${this.variantLabel(variant)}`,
        quantity: item.quantity,
        unitPrice,
        total: this.roundMoney(item.quantity * unitPrice),
      });
    }
    return prepared;
  }

  private async saveSaleItems(
    manager: EntityManager,
    invoice: Invoice,
    items: PreparedSaleItem[],
  ) {
    return manager.getRepository(InvoiceItem).save(
      items.map((item) =>
        manager.getRepository(InvoiceItem).create({
          invoice,
          product: item.product,
          variant: item.variant,
          description: item.description,
          productType: item.product.category,
          productSku: item.product.sku,
          variantLabel: this.variantLabel(item.variant),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        }),
      ),
    );
  }

  private async applySaleStock(
    manager: EntityManager,
    invoice: Invoice,
    items: PreparedSaleItem[],
  ) {
    const productIds = new Set<number>();
    for (const item of items) {
      const previousQuantity = item.variant.quantityAvailable;
      item.variant.quantityAvailable -= item.quantity;
      item.variant.quantitySold += item.quantity;
      await manager.getRepository(ProductVariant).save(item.variant);
      await manager.getRepository(ProductStockMovement).save(
        manager.getRepository(ProductStockMovement).create({
          product: item.product,
          variant: item.variant,
          type: ProductStockMovementType.SALE,
          quantity: item.quantity,
          previousQuantity,
          newQuantity: item.variant.quantityAvailable,
          date: invoice.date,
          reference: invoice.invoiceNumber,
          reason: `Sale to ${invoice.customer.fullName}`,
        }),
      );
      productIds.add(item.product.id);
    }
    for (const productId of productIds) {
      await this.syncProductStock(manager, productId);
    }
  }

  private async restoreInvoiceStock(
    manager: EntityManager,
    invoice: Invoice,
    reason: string,
  ) {
    const productIds = new Set<number>();
    for (const item of invoice.items) {
      if (!item.product || !item.variant) continue;
      const variant = await manager.getRepository(ProductVariant).findOne({
        where: { id: item.variant.id },
      });
      if (!variant) continue;
      const previousQuantity = variant.quantityAvailable;
      variant.quantityAvailable += Math.round(item.quantity);
      variant.quantitySold = Math.max(
        0,
        variant.quantitySold - Math.round(item.quantity),
      );
      await manager.getRepository(ProductVariant).save(variant);
      await manager.getRepository(ProductStockMovement).save(
        manager.getRepository(ProductStockMovement).create({
          product: item.product,
          variant,
          type: ProductStockMovementType.RETURN,
          quantity: Math.round(item.quantity),
          previousQuantity,
          newQuantity: variant.quantityAvailable,
          date: this.toDateKey(new Date()),
          reference: invoice.invoiceNumber,
          reason,
        }),
      );
      productIds.add(item.product.id);
    }
    for (const productId of productIds) {
      await this.syncProductStock(manager, productId);
    }
  }

  private async syncProductStock(manager: EntityManager, productId: number) {
    const product = await manager.getRepository(FinishedProduct).findOne({
      where: { id: productId },
    });
    if (!product) return;
    const totals = await manager
      .getRepository(ProductVariant)
      .createQueryBuilder('variant')
      .select('COALESCE(SUM(variant.quantityProduced), 0)', 'produced')
      .addSelect('COALESCE(SUM(variant.quantityAvailable), 0)', 'available')
      .addSelect('COALESCE(SUM(variant.quantitySold), 0)', 'sold')
      .where('variant.productId = :productId', { productId })
      .getRawOne<Record<string, number | string>>();
    product.quantityProduced = Number(totals?.produced ?? 0);
    product.quantityAvailable = Number(totals?.available ?? 0);
    product.quantitySold = Number(totals?.sold ?? 0);
    await manager.getRepository(FinishedProduct).save(product);
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
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.variant', 'variant')
      .leftJoinAndSelect('invoice.payments', 'payment');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(invoice.invoiceNumber LIKE :search OR customer.fullName LIKE :search OR customer.phone LIKE :search OR item.description LIKE :search OR product.sku LIKE :search)',
        { search },
      );
    }
    const status = query.paymentStatus ?? query.status;
    if (status) qb.andWhere('invoice.paymentStatus = :status', { status });
    if (query.customer?.trim()) {
      const value = query.customer.trim();
      if (/^\d+$/.test(value)) {
        qb.andWhere('customer.id = :customerId', { customerId: Number(value) });
      } else {
        qb.andWhere('customer.fullName LIKE :customerName', {
          customerName: `%${value}%`,
        });
      }
    }
    if (query.date) qb.andWhere('invoice.date = :date', { date: query.date });
    if (query.startDate)
      qb.andWhere('invoice.date >= :startDate', { startDate: query.startDate });
    if (query.endDate)
      qb.andWhere('invoice.date <= :endDate', { endDate: query.endDate });

    qb.orderBy('invoice.date', 'DESC')
      .addOrderBy('invoice.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [invoices, total] = await qb.getManyAndCount();
    for (const invoice of invoices) {
      invoice.items.sort((left, right) => left.id - right.id);
      invoice.payments.sort((left, right) =>
        right.date.localeCompare(left.date),
      );
    }
    return { invoices, pagination: this.pagination(page, limit, total) };
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
        items: { product: true, variant: true },
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException(`Sale ${id} not found`);
    return invoice;
  }

  private ensureCustomerCanBuy(customer: Customer) {
    if (customer.status !== CustomerStatus.ACTIVE) {
      throw new BadRequestException('Only active customers can make purchases');
    }
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
      .andWhere('invoice.invoiceStatus = :invoiceStatus', {
        invoiceStatus: InvoiceStatus.ISSUED,
      })
      .getRawOne<Record<string, number | string | null>>();
    customer.totalPurchases = this.roundMoney(Number(totals?.purchases ?? 0));
    customer.totalPaid = this.roundMoney(Number(totals?.paid ?? 0));
    customer.totalDebt = this.roundMoney(Number(totals?.debt ?? 0));
    if (totals?.firstVisit) customer.firstVisitDate = String(totals.firstVisit);
    if (totals?.lastVisit) customer.lastVisitDate = String(totals.lastVisit);
    await manager.getRepository(Customer).save(customer);
  }

  private async recalculateAllCustomers() {
    const ids = (
      await this.customersRepository.find({ select: { id: true } })
    ).map((customer) => customer.id);
    for (const id of ids) {
      await this.dataSource.transaction((manager) =>
        this.recalculateCustomer(manager, id),
      );
    }
  }

  private async getCustomerInvoiceCounts(customerIds: number[]) {
    const uniqueIds = [...new Set(customerIds)];
    const counts = new Map<number, number>();
    if (uniqueIds.length === 0) return counts;
    const rows = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .select('invoice.customerId', 'customerId')
      .addSelect('COUNT(invoice.id)', 'total')
      .where('invoice.customerId IN (:...ids)', { ids: uniqueIds })
      .groupBy('invoice.customerId')
      .getRawMany<{ customerId: number | string; total: number | string }>();
    for (const row of rows)
      counts.set(Number(row.customerId), Number(row.total));
    return counts;
  }

  private buildPurchaseTrend(invoices: Invoice[]) {
    const months = new Map<string, { amount: number; sales: number }>();
    for (const invoice of invoices) {
      const key = invoice.date.slice(0, 7);
      const current = months.get(key) ?? { amount: 0, sales: 0 };
      current.amount = this.roundMoney(current.amount + invoice.totalAmount);
      current.sales += 1;
      months.set(key, current);
    }
    return [...months.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-12)
      .map(([month, value]) => ({ month, ...value }));
  }

  private buildTopProducts(invoices: Invoice[]) {
    const products = new Map<
      string,
      { name: string; quantity: number; amount: number }
    >();
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const key = item.productSku ?? item.description;
        const current = products.get(key) ?? {
          name: item.product?.name ?? item.description,
          quantity: 0,
          amount: 0,
        };
        current.quantity += item.quantity;
        current.amount = this.roundMoney(current.amount + item.total);
        products.set(key, current);
      }
    }
    return [...products.values()]
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 5);
  }

  private calculatePurchaseFrequency(invoices: Invoice[]) {
    const dates = [...new Set(invoices.map((invoice) => invoice.date))].sort();
    if (dates.length < 2) return null;
    let totalDays = 0;
    for (let index = 1; index < dates.length; index += 1) {
      totalDays += Math.max(
        0,
        Math.round(
          (new Date(dates[index]).getTime() -
            new Date(dates[index - 1]).getTime()) /
            86400000,
        ),
      );
    }
    return Math.round(totalDays / (dates.length - 1));
  }

  private serializeCustomer(customer: Customer, salesCount: number) {
    return {
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      secondPhone: customer.secondPhone ?? null,
      address: customer.address ?? null,
      email: customer.email ?? null,
      city: customer.city ?? null,
      wilaya: customer.wilaya ?? null,
      type: customer.type,
      typeCode: this.enumKey(CustomerType, customer.type),
      status: customer.status,
      statusCode: this.enumKey(CustomerStatus, customer.status),
      firstVisitDate: customer.firstVisitDate,
      lastVisitDate: customer.lastVisitDate,
      lastVisit: customer.lastVisitDate,
      totalPurchases: customer.totalPurchases,
      totalPaid: customer.totalPaid,
      totalDebt: customer.totalDebt,
      salesCount,
      totalSales: salesCount,
      notes: customer.notes ?? null,
      archivedAt: customer.archivedAt ?? null,
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
      date: invoice.date,
      dueDate: invoice.dueDate ?? null,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      taxEnabled: invoice.taxEnabled,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      total: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      paid: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
      remaining: invoice.remainingAmount,
      paymentStatus: invoice.paymentStatus,
      paymentStatusCode: statusCode,
      invoiceStatus: invoice.invoiceStatus,
      statusCode,
      status: statusCode,
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

  private serializeInvoiceItem(item: InvoiceItem) {
    return {
      id: item.id,
      productId: item.product?.id ?? null,
      variantId: item.variant?.id ?? null,
      productName: item.product?.name ?? item.description,
      productSku: item.productSku ?? item.product?.sku ?? null,
      variant: item.variantLabel ?? null,
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
    const method = this.enumKey(PaymentMethod, payment.paymentMethod) || 'CASH';
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
    if (discount > subtotal)
      throw new BadRequestException('Discount cannot exceed subtotal');
    if (paidAmount > totalAmount)
      throw new BadRequestException('paidAmount cannot exceed totalAmount');
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

  private variantLabel(variant: ProductVariant) {
    return (
      [variant.size, variant.color].filter(Boolean).join(' / ') || 'Standard'
    );
  }

  private async sumInvoiceFieldForRange(
    field: 'totalAmount',
    start: string,
    end: string,
  ) {
    return this.invoicesRepository
      .createQueryBuilder('invoice')
      .select(`COALESCE(SUM(invoice.${field}), 0)`, 'total')
      .where('invoice.date BETWEEN :start AND :end', { start, end })
      .getRawOne<{ total: number | string }>();
  }

  private async seedSalesIfEmpty() {
    let customers = await this.customersRepository.find({
      order: { id: 'ASC' },
    });
    if (customers.length === 0) {
      const today = this.toDateKey(new Date());
      customers = await this.customersRepository.save([
        this.customersRepository.create({
          fullName: '\u0633\u0639\u0627\u062f \u0645\u0631\u0632\u0648\u0642',
          phone: '0780000000',
          address: '\u0627\u0644\u062c\u0632\u0627\u0626\u0631',
          city: '\u0627\u0644\u062c\u0632\u0627\u0626\u0631',
          wilaya: '16',
          type: CustomerType.VIP,
          status: CustomerStatus.ACTIVE,
          firstVisitDate: today,
          lastVisitDate: today,
          totalPurchases: 0,
          totalPaid: 0,
          totalDebt: 0,
        }),
        this.customersRepository.create({
          fullName: '\u0645\u062d\u0645\u062f \u0639\u0644\u064a',
          phone: '0551000000',
          city: '\u0648\u0647\u0631\u0627\u0646',
          type: CustomerType.REGULAR,
          status: CustomerStatus.ACTIVE,
          firstVisitDate: today,
          lastVisitDate: today,
          totalPurchases: 0,
          totalPaid: 0,
          totalDebt: 0,
        }),
        this.customersRepository.create({
          fullName:
            '\u0641\u0627\u0637\u0645\u0629 \u0627\u0644\u0632\u0647\u0631\u0627\u0621',
          phone: '0662000000',
          type: CustomerType.NEW,
          status: CustomerStatus.ACTIVE,
          firstVisitDate: today,
          lastVisitDate: today,
          totalPurchases: 0,
          totalPaid: 0,
          totalDebt: 0,
        }),
      ]);
    }
    if ((await this.invoicesRepository.count()) > 0) return;

    const products = await this.productsRepository.find({
      where: { status: FinishedProductStatus.ACTIVE },
      relations: { variants: true },
      order: { id: 'ASC' },
    });
    const product = products.find((item) => item.quantityAvailable >= 3);
    const variant = product?.variants.find(
      (item) => item.active && item.quantityAvailable >= 3,
    );
    if (!product || !variant || customers.length === 0) return;

    await this.createInvoice({
      customerId: customers[0].id,
      items: [
        {
          productId: product.id,
          variantId: variant.id,
          quantity: 3,
        },
      ],
      paidAmount: product.salePrice * 2,
      paymentMethod: PaymentMethod.CASH,
      notes:
        '\u0628\u064a\u0639 \u062a\u062c\u0631\u064a\u0628\u064a \u0645\u0631\u062a\u0628\u0637 \u0628\u0627\u0644\u0645\u062e\u0632\u0648\u0646',
    });
  }

  private enumKey<T extends Record<string, string>>(
    enumType: T,
    value: string,
  ) {
    return (
      Object.entries(enumType).find(([, item]) => item === value)?.[0] ?? ''
    );
  }

  private optionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private normalizePage(value?: number) {
    return Math.max(DEFAULT_PAGE, Math.floor(value ?? DEFAULT_PAGE));
  }

  private normalizeLimit(value?: number, fallback = DEFAULT_LIMIT) {
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(value ?? fallback)));
  }

  private pagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
