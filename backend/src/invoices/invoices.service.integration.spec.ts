import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  CustomerStatus,
  CustomerCreditTargetType,
  DiscountType,
  FinishedProductCategory,
  FinishedProductStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  SalesOrderStatus,
  LegacyDebtStatus,
  LegacyDebtType,
} from '../common/enums';
import { CustomerCreditsService } from '../customer-credits/customer-credits.service';
import { LegacyDebt } from '../legacy-debts/entities/legacy-debt.entity';
import { LegacyDebtPayment } from '../legacy-debts/entities/legacy-debt-payment.entity';
import { FinishedProduct } from '../inventory/entities/finished-product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { SalesService } from '../sales/sales.service';
import { WorkshopSettings } from '../settings/entities/workshop-settings.entity';
import { DocumentSequence } from './entities/document-sequence.entity';
import { InvoicesService } from './invoices.service';

describe('InvoicesService integration', () => {
  const databasePath = join(
    process.cwd(),
    'database',
    `invoice-service-test-${process.pid}.sqlite`,
  );
  let moduleRef: TestingModule;
  let app: INestApplication;
  let dataSource: DataSource;
  let service: InvoicesService;
  let salesService: SalesService;
  let customerCreditsService: CustomerCreditsService;
  let customer: Customer;
  let product: FinishedProduct;
  let order: Order;

  beforeAll(async () => {
    process.env.KHAYATI_DATABASE_PATH = databasePath;
    process.env.TYPEORM_SYNCHRONIZE = 'true';
    // AppModule reads the database path at module load time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } =
      require('../app.module') as typeof import('../app.module');
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = moduleRef.get(DataSource);
    service = moduleRef.get(InvoicesService);
    salesService = moduleRef.get(SalesService);
    customerCreditsService = moduleRef.get(CustomerCreditsService);

    await dataSource.getRepository(WorkshopSettings).save({
      workshopName: 'Atelier test',
      commercialName: 'Khayati Manager',
      defaultCurrency: 'DZD',
      defaultTaxEnabled: false,
      defaultTaxRate: 0,
    });
    customer = await dataSource.getRepository(Customer).save({
      fullName: 'Client facturation',
      phone: '0550000000',
      status: CustomerStatus.ACTIVE,
      firstVisitDate: '2026-08-01',
      lastVisitDate: '2026-08-01',
      totalPurchases: 0,
      totalPaid: 0,
      totalDebt: 0,
    });
    product = await dataSource.getRepository(FinishedProduct).save({
      name: 'Robe A15',
      sku: `ROB-A15-${process.pid}`,
      category: FinishedProductCategory.DRESS,
      creationDate: '2026-08-01',
      salePrice: 9000,
      estimatedProductionCost: 0,
      quantityProduced: 50,
      quantityAvailable: 50,
      quantitySold: 0,
      minStockAlert: 0,
      status: FinishedProductStatus.ACTIVE,
    });
    order = await dataSource.getRepository(Order).save({
      orderNumber: `ORD-2026-${process.pid}`,
      customer,
      orderDate: '2026-08-25',
      status: SalesOrderStatus.CONFIRMED,
    });
    await dataSource.getRepository(OrderItem).save({
      order,
      product,
      productName: product.name,
      description: 'Robe A15 noire',
      reference: product.sku,
      color: 'Noir',
      quantity: 3,
      unitPrice: 9000,
      total: 27000,
    });
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
    for (const suffix of ['', '-journal', '-shm', '-wal']) {
      const path = `${databasePath}${suffix}`;
      if (existsSync(path)) rmSync(path, { force: true });
    }
    delete process.env.KHAYATI_DATABASE_PATH;
    delete process.env.TYPEORM_SYNCHRONIZE;
  });

  it('rolls back the sequence when invoice persistence fails', async () => {
    const collision = await dataSource.getRepository(Invoice).save({
      invoiceNumber: 'INV-2026-0001',
      customer,
      date: '2026-08-25',
      subtotal: 0,
      discount: 0,
      discountType: DiscountType.NONE,
      discountValue: 0,
      discountAmount: 0,
      taxEnabled: false,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      invoiceStatus: InvoiceStatus.ISSUED,
    });

    await expect(
      service.create({
        customerId: customer.id,
        issueDate: '2026-08-25',
        items: [{ productName: 'Service', quantity: 1, unitPrice: 1000 }],
      }),
    ).rejects.toBeDefined();
    expect(await dataSource.getRepository(DocumentSequence).count()).toBe(0);
    await dataSource.getRepository(Invoice).remove(collision);
  });

  it('creates an issued invoice from an order without changing stock', async () => {
    const stockBefore = product.quantityAvailable;
    const invoice = await service.createFromOrder(order.id, {
      issueDate: '2026-08-25',
    });

    expect(invoice.invoiceNumber).toBe('INV-2026-0001');
    expect(invoice.totalAmountMinor).toBe(2_700_000);
    expect(invoice.items[0].productName).toBe('Robe A15');
    expect(invoice.items[0].reference).toBe(product.sku);
    expect(invoice.customerSnapshot?.fullName).toBe(customer.fullName);
    expect(invoice.workshopSnapshot?.workshopName).toBe('Atelier test');

    const refreshedProduct = await dataSource
      .getRepository(FinishedProduct)
      .findOneByOrFail({ id: product.id });
    const refreshedOrder = await dataSource
      .getRepository(Order)
      .findOneByOrFail({ id: order.id });
    expect(refreshedProduct.quantityAvailable).toBe(stockBefore);
    expect(refreshedOrder.status).toBe(SalesOrderStatus.INVOICED);

    await expect(service.createFromOrder(order.id, {})).rejects.toThrow(
      'already has an invoice',
    );
  });

  it('cancels safely, then allocates the next number to a manual invoice', async () => {
    const orderInvoice = await dataSource.getRepository(Invoice).findOneOrFail({
      where: { order: { id: order.id } },
    });
    await service.cancel(orderInvoice.id, { reason: 'Erreur de saisie' });

    const refreshedOrder = await dataSource
      .getRepository(Order)
      .findOneByOrFail({ id: order.id });
    expect(refreshedOrder.status).toBe(SalesOrderStatus.CONFIRMED);

    await expect(
      service.create({
        customerId: customer.id,
        issueDate: '2026-08-25',
        items: [{ productId: product.id, quantity: 1, unitPrice: 1000 }],
        initialPayment: {
          amount: 1001,
          paymentMethod: PaymentMethod.CASH,
        },
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
      }),
    });

    const invoice = await service.create({
      customerId: customer.id,
      issueDate: '2026-08-25',
      discountType: DiscountType.FIXED,
      discountValue: 500,
      taxEnabled: true,
      taxRate: 19,
      items: [{ productId: product.id, quantity: 3, unitPrice: 3500 }],
      initialPayment: {
        amount: 4000,
        paymentMethod: PaymentMethod.CASH,
        paymentDate: '2026-08-25',
        notes: 'Premier versement',
      },
    });
    expect(invoice.invoiceNumber).toBe('INV-2026-0002');
    expect(invoice.subtotalMinor).toBe(1_050_000);
    expect(invoice.discountAmountMinor).toBe(50_000);
    expect(invoice.taxAmountMinor).toBe(190_000);
    expect(invoice.totalAmountMinor).toBe(1_190_000);
    expect(invoice.paidAmountMinor).toBe(400_000);
    expect(invoice.remainingAmountMinor).toBe(790_000);
    expect(invoice.paymentStatus).toBe(PaymentStatus.PARTIALLY_PAID);
    expect(invoice.payments).toHaveLength(1);

    const refreshedCustomer = await dataSource
      .getRepository(Customer)
      .findOneByOrFail({ id: customer.id });
    expect(refreshedCustomer.totalPurchases).toBe(11900);
    expect(refreshedCustomer.totalPaid).toBe(4000);
    expect(refreshedCustomer.totalDebt).toBe(7900);
  });

  it('splits an explicitly confirmed overpayment from the invoice atomically', async () => {
    const invoice = await dataSource.getRepository(Invoice).findOneOrFail({
      where: { invoiceNumber: 'INV-2026-0002' },
    });
    await expect(
      salesService.createPayment({
        customerId: customer.id,
        invoiceId: invoice.id,
        amount: 9000,
        paymentMethod: PaymentMethod.TRANSFER,
        date: '2026-08-26',
        reference: 'TRX-TEST-1',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
        overpaymentAmount: 1100,
      }),
    });

    const result = await salesService.createPayment({
      customerId: customer.id,
      invoiceId: invoice.id,
      amount: 9000,
      paymentMethod: PaymentMethod.TRANSFER,
      date: '2026-08-26',
      reference: 'TRX-TEST-1',
      confirmOverpayment: true,
    });

    expect(result.invoice.paidAmount).toBe(11900);
    expect(result.invoice.remainingAmount).toBe(0);
    expect(result.invoice.paymentStatus).toBe(PaymentStatus.PAID);
    expect(result.payment?.reference).toBe('TRX-TEST-1');
    expect(result.payment?.amount).toBe(7900);
    expect(result.overpaymentCredit).toMatchObject({
      amount: 1100,
      type: 'OVERPAYMENT',
    });

    const history = await service.getPayments(invoice.id);
    expect(history.data).toHaveLength(2);
    expect(history.data.map((payment) => payment.amountMinor).sort()).toEqual([
      400_000, 790_000,
    ]);

    await expect(
      service.addPayment(invoice.id, {
        amount: 1,
        paymentMethod: PaymentMethod.CASH,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
      }),
    });
    expect((await service.getPayments(invoice.id)).data).toHaveLength(2);

    const refreshedCustomer = await dataSource
      .getRepository(Customer)
      .findOneByOrFail({ id: customer.id });
    expect(refreshedCustomer.totalPaid).toBe(11900);
    expect(refreshedCustomer.totalDebt).toBe(0);
  });

  it('tracks advance, allocations, refund and reversal without netting debts', async () => {
    const creditCustomer = await dataSource.getRepository(Customer).save({
      fullName: 'Client credit integration',
      phone: `066${process.pid}`,
      status: CustomerStatus.ACTIVE,
      firstVisitDate: '2026-08-01',
      lastVisitDate: '2026-08-01',
      totalPurchases: 0,
      totalPaid: 0,
      totalDebt: 0,
    });
    const creditInvoice = await dataSource.getRepository(Invoice).save({
      invoiceNumber: `INV-CREDIT-${process.pid}`,
      customer: creditCustomer,
      date: '2026-08-27',
      subtotal: 80000,
      discount: 0,
      discountType: DiscountType.NONE,
      discountValue: 0,
      discountAmount: 0,
      taxEnabled: false,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 80000,
      paidAmount: 0,
      remainingAmount: 80000,
      paymentStatus: PaymentStatus.UNPAID,
      invoiceStatus: InvoiceStatus.ISSUED,
    });
    const legacyDebt = await dataSource.getRepository(LegacyDebt).save({
      type: LegacyDebtType.CUSTOMER_RECEIVABLE,
      customer: creditCustomer,
      supplier: null,
      originalAmount: 70000,
      paidAmount: 0,
      remainingAmount: 70000,
      originalAmountMinor: 7_000_000,
      paidAmountMinor: 0,
      remainingAmountMinor: 7_000_000,
      debtDate: null,
      dateIsUnknown: true,
      status: LegacyDebtStatus.OPEN,
    });

    await customerCreditsService.addAdvance(creditCustomer.id, {
      amount: 50000,
      date: '2026-08-27',
      paymentMethod: PaymentMethod.CASH,
    });
    await customerCreditsService.apply(
      creditCustomer.id,
      {
        targetType: CustomerCreditTargetType.INVOICE,
        targetId: creditInvoice.id,
        amount: 30000,
      },
    );
    await customerCreditsService.addAdvance(creditCustomer.id, {
      amount: 20000,
      date: '2026-08-28',
      paymentMethod: PaymentMethod.TRANSFER,
    });
    const legacyUsage = await customerCreditsService.apply(creditCustomer.id, {
      targetType: CustomerCreditTargetType.LEGACY_DEBT,
      targetId: legacyDebt.id,
      amount: 15000,
    });
    await customerCreditsService.refund(creditCustomer.id, {
      amount: 5000,
      date: '2026-08-29',
      paymentMethod: PaymentMethod.CASH,
    });

    expect(
      (await customerCreditsService.getSummary(creditCustomer.id))
        .availableCredit,
    ).toBe(20000);
    expect(
      (
        await dataSource
          .getRepository(Invoice)
          .findOneByOrFail({ id: creditInvoice.id })
      ).remainingAmount,
    ).toBe(50000);
    expect(
      (
        await dataSource
          .getRepository(LegacyDebt)
          .findOneByOrFail({ id: legacyDebt.id })
      ).remainingAmount,
    ).toBe(55000);

    await service.cancel(creditInvoice.id, {
      reason: 'Cancellation restores allocated customer credit',
    });
    expect(
      (await customerCreditsService.getSummary(creditCustomer.id))
        .availableCredit,
    ).toBe(50000);
    expect(
      (
        await dataSource
          .getRepository(Invoice)
          .findOneByOrFail({ id: creditInvoice.id })
      ).invoiceStatus,
    ).toBe(InvoiceStatus.CANCELLED);

    await customerCreditsService.reverse(
      creditCustomer.id,
      legacyUsage.transaction.id,
      'Correction integration test',
    );
    expect(
      (await customerCreditsService.getSummary(creditCustomer.id))
        .availableCredit,
    ).toBe(65000);
    expect(
      (
        await dataSource
          .getRepository(LegacyDebt)
          .findOneByOrFail({ id: legacyDebt.id })
      ).remainingAmount,
    ).toBe(70000);
    const reversedLegacyPayment = await dataSource
      .getRepository(LegacyDebtPayment)
      .findOneByOrFail({
        id: Number(legacyUsage.transaction.legacyDebtPaymentId),
      });
    expect(reversedLegacyPayment.cancelledAt).toBeInstanceOf(Date);
  });

  it('exposes the draft, issue, payment, history and preview REST workflow', async () => {
    const invalidResponse = await request(app.getHttpServer())
      .post('/invoices')
      .send({
        customerId: customer.id,
        unexpectedField: true,
        items: [{ productName: 'Retouche', quantity: 0, unitPrice: 2500 }],
      })
      .expect(400);
    expect(invalidResponse.body.message).toEqual(
      expect.arrayContaining([
        'property unexpectedField should not exist',
        'items.0.quantity must not be less than 1',
      ]),
    );

    const apiOrder = await dataSource.getRepository(Order).save({
      orderNumber: `ORD-API-${process.pid}`,
      customer,
      orderDate: '2026-08-27',
      status: SalesOrderStatus.CONFIRMED,
    });
    await dataSource.getRepository(OrderItem).save({
      order: apiOrder,
      product,
      productName: product.name,
      reference: product.sku,
      quantity: 1,
      unitPrice: 9000,
      total: 9000,
    });
    const orderInvoiceResponse = await request(app.getHttpServer())
      .post(`/invoices/from-order/${apiOrder.id}`)
      .send({ issueDate: '2026-08-27' })
      .expect(201);
    expect(orderInvoiceResponse.body.orderNumberSnapshot).toBe(
      apiOrder.orderNumber,
    );
    await request(app.getHttpServer())
      .post(`/invoices/${orderInvoiceResponse.body.id}/cancel`)
      .send({ reason: 'Commande annulée avant règlement' })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/invoices/${orderInvoiceResponse.body.id}/pdf`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200)
      .expect('Content-Type', /application\/pdf/);

    const createdResponse = await request(app.getHttpServer())
      .post('/invoices')
      .send({
        customerId: customer.id,
        issueDate: '2026-08-27',
        invoiceStatus: 'DRAFT',
        items: [{ productName: 'Retouche', quantity: 1, unitPrice: 2500 }],
      })
      .expect(201);
    const invoiceId = Number(createdResponse.body.id);
    expect(createdResponse.body.invoiceNumber).toBe('INV-2026-0004');
    expect(createdResponse.body.invoiceStatus).toBe(InvoiceStatus.DRAFT);

    const updatedResponse = await request(app.getHttpServer())
      .patch(`/invoices/${invoiceId}`)
      .send({ notes: 'Facture vérifiée avant émission' })
      .expect(200);
    expect(updatedResponse.body.notes).toBe('Facture vérifiée avant émission');

    await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}/pdf`)
      .expect(409);

    const issuedResponse = await request(app.getHttpServer())
      .post(`/invoices/${invoiceId}/issue`)
      .expect(200);
    expect(issuedResponse.body.invoiceStatus).toBe(InvoiceStatus.ISSUED);

    const paymentResponse = await request(app.getHttpServer())
      .post(`/invoices/${invoiceId}/payments`)
      .send({
        amount: 2500,
        paymentMethod: 'CASH',
        paymentDate: '2026-08-27',
      })
      .expect(201);
    expect(paymentResponse.body.invoice.paymentStatus).toBe(PaymentStatus.PAID);

    const historyResponse = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}/payments`)
      .expect(200);
    expect(historyResponse.body.data).toHaveLength(1);
    expect(historyResponse.body.data[0].amountMinor).toBe(250_000);

    const previewResponse = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}/preview`)
      .expect(200);
    expect(previewResponse.body.items[0].productName).toBe('Retouche');
    expect(previewResponse.body.payments).toHaveLength(1);

    const pdfResponse = await request(app.getHttpServer())
      .get(`/invoices/${invoiceId}/pdf`)
      .buffer(true)
      .parse(binaryParser)
      .expect(200)
      .expect('Content-Type', /application\/pdf/);
    expect(pdfResponse.headers['content-disposition']).toContain(
      `Invoice_${createdResponse.body.invoiceNumber}.pdf`,
    );
    expect(Buffer.isBuffer(pdfResponse.body)).toBe(true);
    expect(pdfResponse.body.subarray(0, 5).toString()).toBe('%PDF-');
    const pdfDocument = await PDFDocument.load(pdfResponse.body);
    expect(pdfDocument.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(pdfDocument.getTitle()).toBe(
      `Invoice ${createdResponse.body.invoiceNumber}`,
    );

    const listResponse = await request(app.getHttpServer())
      .get('/invoices')
      .query({ search: 'INV-2026-0004', page: 1, limit: 10 })
      .expect(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.pagination.total).toBe(1);

    await request(app.getHttpServer())
      .post(`/invoices/${invoiceId}/cancel`)
      .send({ reason: 'Annulation impossible après paiement' })
      .expect(409);
  });
});

function binaryParser(
  response,
  callback: (error: Error | null, body?: Buffer) => void,
) {
  const chunks: Buffer[] = [];
  response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
  response.on('error', (error: Error) => callback(error));
}
