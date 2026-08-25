import { Test, TestingModule } from '@nestjs/testing';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import {
  CustomerStatus,
  DiscountType,
  FinishedProductCategory,
  FinishedProductStatus,
  InvoiceStatus,
  SalesOrderStatus,
} from '../common/enums';
import { FinishedProduct } from '../inventory/entities/finished-product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Invoice } from '../sales/entities/invoice.entity';
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
  let dataSource: DataSource;
  let service: InvoicesService;
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
    await moduleRef.init();

    dataSource = moduleRef.get(DataSource);
    service = moduleRef.get(InvoicesService);

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
  });

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
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

    const invoice = await service.create({
      customerId: customer.id,
      issueDate: '2026-08-25',
      discountType: DiscountType.FIXED,
      discountValue: 500,
      taxEnabled: true,
      taxRate: 19,
      items: [{ productId: product.id, quantity: 3, unitPrice: 3500 }],
    });
    expect(invoice.invoiceNumber).toBe('INV-2026-0002');
    expect(invoice.subtotalMinor).toBe(1_050_000);
    expect(invoice.discountAmountMinor).toBe(50_000);
    expect(invoice.taxAmountMinor).toBe(190_000);
    expect(invoice.totalAmountMinor).toBe(1_190_000);

    const refreshedCustomer = await dataSource
      .getRepository(Customer)
      .findOneByOrFail({ id: customer.id });
    expect(refreshedCustomer.totalPurchases).toBe(11900);
    expect(refreshedCustomer.totalDebt).toBe(11900);
  });
});
