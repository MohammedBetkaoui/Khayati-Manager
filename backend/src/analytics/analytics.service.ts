import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ExpenseCategory,
  ExpenseStatus,
  FinishedProductStatus,
  InvoiceStatus,
  LegacyDebtStatus,
  LegacyDebtType,
  PayrollStatus,
  SalaryType,
} from '../common/enums';
import { Expense } from '../expenses/entities/expense.entity';
import { FinishedProduct } from '../inventory/entities/finished-product.entity';
import { ProductionBatch } from '../inventory/entities/production-batch.entity';
import { SupplierAdvance } from '../inventory/entities/supplier-advance.entity';
import { SupplierPayment } from '../inventory/entities/supplier-payment.entity';
import { SupplierPurchase } from '../inventory/entities/supplier-purchase.entity';
import { Supplier } from '../inventory/entities/supplier.entity';
import { Advance } from '../payroll/entities/advance.entity';
import { Payroll } from '../payroll/entities/payroll.entity';
import { SalaryPayment } from '../payroll/entities/salary-payment.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { Payment } from '../sales/entities/payment.entity';
import { LegacyDebt } from '../legacy-debts/entities/legacy-debt.entity';
import { LegacyDebtPayment } from '../legacy-debts/entities/legacy-debt-payment.entity';

type MonthRow = {
  month: string;
  startDate: string;
  endDate: string;
};

type ProductAggregate = {
  productId: number | null;
  productName: string;
  quantity: number;
  revenue: number;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(Payroll)
    private readonly payrollRepository: Repository<Payroll>,
    @InjectRepository(SalaryPayment)
    private readonly salaryPaymentRepository: Repository<SalaryPayment>,
    @InjectRepository(Advance)
    private readonly advanceRepository: Repository<Advance>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierPurchase)
    private readonly supplierPurchaseRepository: Repository<SupplierPurchase>,
    @InjectRepository(SupplierPayment)
    private readonly supplierPaymentRepository: Repository<SupplierPayment>,
    @InjectRepository(SupplierAdvance)
    private readonly supplierAdvanceRepository: Repository<SupplierAdvance>,
    @InjectRepository(FinishedProduct)
    private readonly productRepository: Repository<FinishedProduct>,
    @InjectRepository(ProductionBatch)
    private readonly productionRepository: Repository<ProductionBatch>,
    @InjectRepository(LegacyDebt)
    private readonly legacyDebtRepository: Repository<LegacyDebt>,
    @InjectRepository(LegacyDebtPayment)
    private readonly legacyDebtPaymentRepository: Repository<LegacyDebtPayment>,
  ) {}

  async getDashboard(monthCount = 12) {
    const months = this.lastMonths(Math.min(24, Math.max(3, monthCount)));
    const startDate = months[0].startDate;
    const endDate = months[months.length - 1].endDate;
    const today = this.dateKey(new Date());

    const [
      invoices,
      payments,
      customers,
      expenses,
      payrolls,
      salaryPayments,
      workerAdvances,
      suppliers,
      purchases,
      supplierPayments,
      supplierAdvances,
      products,
      productions,
      legacyDebts,
      legacyPayments,
    ] = await Promise.all([
      this.invoiceRepository.find({
        relations: { customer: true, items: { product: true } },
        order: { date: 'ASC', id: 'ASC' },
      }),
      this.paymentRepository.find({ order: { date: 'ASC', id: 'ASC' } }),
      this.customerRepository.find(),
      this.expenseRepository.find({ order: { date: 'ASC', id: 'ASC' } }),
      this.payrollRepository.find({
        relations: { worker: true },
        order: { periodEnd: 'ASC', id: 'ASC' },
      }),
      this.salaryPaymentRepository.find({ order: { date: 'ASC', id: 'ASC' } }),
      this.advanceRepository.find({ order: { date: 'ASC', id: 'ASC' } }),
      this.supplierRepository.find(),
      this.supplierPurchaseRepository.find({
        relations: { supplier: true },
        order: { purchaseDate: 'ASC', id: 'ASC' },
      }),
      this.supplierPaymentRepository.find({
        order: { date: 'ASC', id: 'ASC' },
      }),
      this.supplierAdvanceRepository.find({
        order: { date: 'ASC', id: 'ASC' },
      }),
      this.productRepository.find({
        order: { quantityAvailable: 'DESC', id: 'ASC' },
      }),
      this.productionRepository.find({ order: { date: 'ASC', id: 'ASC' } }),
      this.legacyDebtRepository.find({
        relations: { customer: true, supplier: true, payments: true },
        order: { id: 'ASC' },
      }),
      this.legacyDebtPaymentRepository.find({
        relations: { legacyDebt: true },
        order: { paymentDate: 'ASC', id: 'ASC' },
      }),
    ]);

    const issuedInvoices = invoices.filter(
      (invoice) => invoice.invoiceStatus === InvoiceStatus.ISSUED,
    );
    const activePayrolls = payrolls.filter(
      (payroll) => payroll.status !== PayrollStatus.CANCELLED,
    );
    const activeExpenses = expenses.filter(
      (expense) =>
        !expense.archivedAt && expense.status !== ExpenseStatus.CANCELLED,
    );
    const periodInvoices = issuedInvoices.filter((invoice) =>
      this.inRange(invoice.date, startDate, endDate),
    );
    const periodPayrolls = activePayrolls.filter((payroll) =>
      this.inRange(payroll.periodEnd, startDate, endDate),
    );
    const periodPurchases = purchases.filter((purchase) =>
      this.inRange(purchase.purchaseDate, startDate, endDate),
    );
    const periodExpenses = activeExpenses.filter((expense) =>
      this.inRange(expense.date, startDate, endDate),
    );
    const activeLegacyDebts = legacyDebts.filter(
      (debt) => debt.status !== LegacyDebtStatus.CANCELLED,
    );
    const customerLegacyPayments = legacyPayments.filter(
      (payment) =>
        payment.legacyDebt.type === LegacyDebtType.CUSTOMER_RECEIVABLE,
    );
    const supplierLegacyPayments = legacyPayments.filter(
      (payment) =>
        payment.legacyDebt.type === LegacyDebtType.SUPPLIER_PAYABLE,
    );
    const customerLegacyMap = this.legacyOutstandingByOwner(
      activeLegacyDebts,
      LegacyDebtType.CUSTOMER_RECEIVABLE,
    );
    const supplierLegacyMap = this.legacyOutstandingByOwner(
      activeLegacyDebts,
      LegacyDebtType.SUPPLIER_PAYABLE,
    );

    const financialTrend = months.map((month) => ({
      month: month.month,
      sales: this.sum(
        issuedInvoices.filter((invoice) =>
          invoice.date.startsWith(month.month),
        ),
        (invoice) => invoice.totalAmount,
      ),
      receipts: this.sum(
        payments.filter((payment) => payment.date.startsWith(month.month)),
        (payment) => payment.amount,
      ) +
        this.sum(
          customerLegacyPayments.filter((payment) =>
            payment.paymentDate.startsWith(month.month),
          ),
          (payment) => payment.amount,
        ),
      outflows: this.money(
        this.sum(
          salaryPayments.filter((payment) =>
            payment.date.startsWith(month.month),
          ),
          (payment) => payment.amount,
        ) +
          this.sum(
            workerAdvances.filter((advance) =>
              advance.date.startsWith(month.month),
            ),
            (advance) => advance.amount,
          ) +
          this.sum(
            supplierPayments.filter((payment) =>
              payment.date.startsWith(month.month),
            ),
            (payment) => payment.amount,
          ) +
          this.sum(
            supplierAdvances.filter((advance) =>
              advance.date.startsWith(month.month),
            ),
            (advance) => advance.amount,
          ) +
          this.sum(
            activeExpenses.filter((expense) =>
              expense.date.startsWith(month.month),
            ),
            (expense) => expense.paidAmount,
          ) +
          this.sum(
            supplierLegacyPayments.filter((payment) =>
              payment.paymentDate.startsWith(month.month),
            ),
            (payment) => payment.amount,
          ),
      ),
    }));

    const expenseBreakdown = months.map((month) => {
      const row = {
        month: month.month,
        salaries: 0,
        materials: 0,
        rent: 0,
        maintenance: 0,
        transport: 0,
        other: 0,
      };
      row.salaries += this.sum(
        activePayrolls.filter((payroll) =>
          payroll.periodEnd.startsWith(month.month),
        ),
        (payroll) => payroll.grossAmount,
      );
      row.materials += this.sum(
        purchases.filter((purchase) =>
          purchase.purchaseDate.startsWith(month.month),
        ),
        (purchase) => purchase.totalAmount,
      );
      for (const expense of activeExpenses.filter((item) =>
        item.date.startsWith(month.month),
      )) {
        row[this.expenseBucket(expense.category)] += Number(
          expense.amount ?? 0,
        );
      }
      return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          typeof value === 'number' ? this.money(value) : value,
        ]),
      ) as typeof row;
    });

    const productionSales = months.map((month) => ({
      month: month.month,
      produced: this.integerSum(
        productions.filter((production) =>
          production.date.startsWith(month.month),
        ),
        (production) => production.quantityProduced,
      ),
      sold: this.integerSum(
        issuedInvoices.filter((invoice) =>
          invoice.date.startsWith(month.month),
        ),
        (invoice) =>
          invoice.items.reduce(
            (sum, item) => sum + Number(item.quantity ?? 0),
            0,
          ),
      ),
    }));

    const topProducts = this.topProducts(periodInvoices, 10);
    const finishedStock = products
      .filter((product) => product.status === FinishedProductStatus.ACTIVE)
      .slice(0, 12)
      .map((product) => ({
        productId: product.id,
        name: product.name,
        quantityAvailable: product.quantityAvailable,
        quantityProduced: product.quantityProduced,
        quantitySold: product.quantitySold,
      }));

    const debtTrend = months.map((month, index) => ({
      month: month.month,
      customerDebt:
        index === months.length - 1
          ? this.money(
              this.sum(customers, (customer) => customer.totalDebt) +
                this.sumMap(customerLegacyMap),
            )
          : this.money(
              Math.max(
                0,
                this.sum(
                  issuedInvoices.filter(
                    (invoice) => invoice.date <= month.endDate,
                  ),
                  (invoice) => invoice.totalAmount,
                ) -
                  this.sum(
                    payments.filter((payment) => payment.date <= month.endDate),
                    (payment) => payment.amount,
                  ),
              ),
            ),
      supplierDebt:
        index === months.length - 1
          ? this.money(
              this.sum(suppliers, (supplier) => supplier.totalDebt) +
                this.sumMap(supplierLegacyMap),
            )
          : this.money(
              Math.max(
                0,
                this.sum(
                  purchases.filter(
                    (purchase) => purchase.purchaseDate <= month.endDate,
                  ),
                  (purchase) => purchase.totalAmount,
                ) -
                  this.sum(
                    supplierPayments.filter(
                      (payment) => payment.date <= month.endDate,
                    ),
                    (payment) => payment.amount,
                  ) -
                  this.sum(
                    supplierAdvances.filter(
                      (advance) => advance.date <= month.endDate,
                    ),
                    (advance) => advance.amount,
                  ),
              ),
            ),
    }));

    const customerRevenue = new Map<
      number,
      { id: number; fullName: string; revenue: number; salesCount: number }
    >();
    for (const invoice of periodInvoices) {
      const current = customerRevenue.get(invoice.customer.id) ?? {
        id: invoice.customer.id,
        fullName: invoice.customer.fullName,
        revenue: 0,
        salesCount: 0,
      };
      current.revenue += Number(invoice.totalAmount ?? 0);
      current.salesCount += 1;
      customerRevenue.set(invoice.customer.id, current);
    }

    const productLastSale = new Map<number, string>();
    for (const invoice of issuedInvoices) {
      for (const item of invoice.items) {
        if (!item.product?.id) continue;
        const previous = productLastSale.get(item.product.id);
        if (!previous || invoice.date > previous) {
          productLastSale.set(item.product.id, invoice.date);
        }
      }
    }

    const payrollPaid = this.sum(
      periodPayrolls,
      (payroll) => payroll.paidAmount,
    );
    const payrollRemaining = this.sum(
      periodPayrolls,
      (payroll) => payroll.remainingAmount,
    );
    const periodSales = this.sum(
      periodInvoices,
      (invoice) => invoice.totalAmount,
    );
    const periodReceipts = this.sum(
      payments.filter((payment) =>
        this.inRange(payment.date, startDate, endDate),
      ),
      (payment) => payment.amount,
    ) +
      this.sum(
        customerLegacyPayments.filter((payment) =>
          this.inRange(payment.paymentDate, startDate, endDate),
        ),
        (payment) => payment.amount,
      );
    const periodOutflows = this.sum(financialTrend, (row) => row.outflows);

    return {
      period: { months: months.length, startDate, endDate },
      summary: {
        sales: periodSales,
        receipts: periodReceipts,
        outflows: periodOutflows,
        estimatedCashFlow: this.money(periodReceipts - periodOutflows),
        customerDebt: this.money(
          this.sum(customers, (customer) => customer.totalDebt) +
            this.sumMap(customerLegacyMap),
        ),
        currentCustomerDebt: this.sum(
          customers,
          (customer) => customer.totalDebt,
        ),
        legacyCustomerDebt: this.money(this.sumMap(customerLegacyMap)),
        supplierDebt: this.money(
          this.sum(suppliers, (supplier) => supplier.totalDebt) +
            this.sumMap(supplierLegacyMap),
        ),
        currentSupplierDebt: this.sum(
          suppliers,
          (supplier) => supplier.totalDebt,
        ),
        legacySupplierDebt: this.money(this.sumMap(supplierLegacyMap)),
        payrollPaid,
        payrollRemaining,
      },
      financialTrend,
      expenseBreakdown,
      productionSales,
      topProducts,
      finishedStock,
      debtTrend,
      insights: {
        topCustomers: [...customerRevenue.values()]
          .map((item) => ({ ...item, revenue: this.money(item.revenue) }))
          .sort((left, right) => right.revenue - left.revenue)
          .slice(0, 5),
        customerDebts: customers
          .map((customer) => ({
            customer,
            debt: this.money(
              customer.totalDebt + (customerLegacyMap.get(customer.id) ?? 0),
            ),
          }))
          .filter((item) => item.debt > 0)
          .sort((left, right) => right.debt - left.debt)
          .slice(0, 5)
          .map(({ customer, debt }) => ({
            id: customer.id,
            fullName: customer.fullName,
            phone: customer.phone,
            debt,
            currentDebt: this.money(customer.totalDebt),
            legacyDebt: this.money(customerLegacyMap.get(customer.id) ?? 0),
          })),
        supplierDebts: suppliers
          .map((supplier) => ({
            supplier,
            debt: this.money(
              supplier.totalDebt + (supplierLegacyMap.get(supplier.id) ?? 0),
            ),
          }))
          .filter((item) => item.debt > 0)
          .sort((left, right) => right.debt - left.debt)
          .slice(0, 5)
          .map(({ supplier, debt }) => ({
            id: supplier.id,
            name: supplier.name,
            phone: supplier.phone ?? null,
            debt,
            currentDebt: this.money(supplier.totalDebt),
            legacyDebt: this.money(supplierLegacyMap.get(supplier.id) ?? 0),
          })),
        overdueInvoices: issuedInvoices
          .filter(
            (invoice) =>
              invoice.remainingAmount > 0 &&
              Boolean(invoice.dueDate) &&
              String(invoice.dueDate) < today,
          )
          .sort((left, right) =>
            String(left.dueDate).localeCompare(String(right.dueDate)),
          )
          .slice(0, 8)
          .map((invoice) => ({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerId: invoice.customer.id,
            customerName: invoice.customer.fullName,
            dueDate: invoice.dueDate,
            remainingAmount: this.money(invoice.remainingAmount),
            daysOverdue: this.daysBetween(String(invoice.dueDate), today),
          })),
        supplierPaymentsDue: purchases
          .filter((purchase) => purchase.remainingAmount > 0)
          .sort((left, right) =>
            left.purchaseDate.localeCompare(right.purchaseDate),
          )
          .slice(0, 8)
          .map((purchase) => {
            const daysOpen = this.daysBetween(purchase.purchaseDate, today);
            return {
              purchaseId: purchase.id,
              supplierId: purchase.supplier.id,
              supplierName: purchase.supplier.name,
              materialName: purchase.materialName,
              purchaseDate: purchase.purchaseDate,
              remainingAmount: this.money(purchase.remainingAmount),
              daysOpen,
              status: daysOpen > 30 ? 'OLD' : 'OPEN',
            };
          }),
        inactiveProducts: products
          .filter((product) => product.status === FinishedProductStatus.ACTIVE)
          .map((product) => {
            const lastSaleDate = productLastSale.get(product.id) ?? null;
            const referenceDate = lastSaleDate ?? product.creationDate;
            const inactiveDays = this.daysBetween(referenceDate, today);
            return {
              productId: product.id,
              name: product.name,
              quantityAvailable: product.quantityAvailable,
              lastSaleDate,
              inactiveDays,
              level: inactiveDays >= 60 ? '60_DAYS' : '30_DAYS',
            };
          })
          .filter((product) => product.inactiveDays >= 30)
          .sort((left, right) => right.inactiveDays - left.inactiveDays)
          .slice(0, 8),
        payroll: {
          totalDue: this.sum(periodPayrolls, (payroll) => payroll.grossAmount),
          totalPaid: payrollPaid,
          totalRemaining: payrollRemaining,
          payrollCount: periodPayrolls.length,
        },
        pieceWorkers: this.pieceWorkerStats(periodPayrolls),
      },
      sourceCounts: {
        invoices: periodInvoices.length,
        purchases: periodPurchases.length,
        payrolls: periodPayrolls.length,
        manualExpenses: periodExpenses.length,
        legacyCustomerPayments: customerLegacyPayments.filter((payment) =>
          this.inRange(payment.paymentDate, startDate, endDate),
        ).length,
        legacySupplierPayments: supplierLegacyPayments.filter((payment) =>
          this.inRange(payment.paymentDate, startDate, endDate),
        ).length,
      },
    };
  }

  private topProducts(invoices: Invoice[], limit: number) {
    const values = new Map<string, ProductAggregate>();
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const productId = item.product?.id ?? null;
        const productName = item.productName || item.description;
        const key = productId ? `id:${productId}` : `name:${productName}`;
        const current = values.get(key) ?? {
          productId,
          productName,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += Number(item.quantity ?? 0);
        current.revenue += Number(item.total ?? 0);
        values.set(key, current);
      }
    }
    return [...values.values()]
      .map((item) => ({ ...item, revenue: this.money(item.revenue) }))
      .sort(
        (left, right) =>
          right.quantity - left.quantity || right.revenue - left.revenue,
      )
      .slice(0, limit);
  }

  private legacyOutstandingByOwner(
    debts: LegacyDebt[],
    type: LegacyDebtType,
  ) {
    const result = new Map<number, number>();
    for (const debt of debts.filter((item) => item.type === type)) {
      const ownerId = debt.customer?.id ?? debt.supplier?.id;
      if (!ownerId) continue;
      result.set(
        ownerId,
        this.money((result.get(ownerId) ?? 0) + debt.remainingAmount),
      );
    }
    return result;
  }

  private sumMap(values: Map<number, number>) {
    let total = 0;
    for (const value of values.values()) total += value;
    return this.money(total);
  }

  private pieceWorkerStats(payrolls: Payroll[]) {
    const values = new Map<
      number,
      { workerId: number; workerName: string; pieces: number; amount: number }
    >();
    for (const payroll of payrolls.filter(
      (item) => item.salaryTypeSnapshot === SalaryType.PIECE,
    )) {
      const current = values.get(payroll.worker.id) ?? {
        workerId: payroll.worker.id,
        workerName: payroll.worker.fullName,
        pieces: 0,
        amount: 0,
      };
      current.pieces += Number(payroll.piecesCompleted ?? 0);
      current.amount += Number(payroll.grossAmount ?? 0);
      values.set(payroll.worker.id, current);
    }
    return [...values.values()]
      .map((item) => ({ ...item, amount: this.money(item.amount) }))
      .sort((left, right) => right.pieces - left.pieces)
      .slice(0, 8);
  }

  private expenseBucket(category: ExpenseCategory) {
    if (category === ExpenseCategory.WORKER_SALARIES)
      return 'salaries' as const;
    if (
      [
        ExpenseCategory.MATERIAL_PURCHASE,
        ExpenseCategory.FABRIC_PURCHASE,
        ExpenseCategory.THREADS_ACCESSORIES,
      ].includes(category)
    ) {
      return 'materials' as const;
    }
    if (category === ExpenseCategory.RENT) return 'rent' as const;
    if (
      [
        ExpenseCategory.MAINTENANCE,
        ExpenseCategory.REPAIR,
        ExpenseCategory.MACHINE_MAINTENANCE,
      ].includes(category)
    ) {
      return 'maintenance' as const;
    }
    if ([ExpenseCategory.TRANSPORT, ExpenseCategory.FUEL].includes(category)) {
      return 'transport' as const;
    }
    return 'other' as const;
  }

  private lastMonths(count: number): MonthRow[] {
    const current = new Date();
    current.setDate(1);
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(current);
      date.setMonth(current.getMonth() - (count - index - 1));
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return {
        month,
        startDate: `${month}-01`,
        endDate: this.dateKey(end),
      };
    });
  }

  private inRange(date: string, startDate: string, endDate: string) {
    return date >= startDate && date <= endDate;
  }

  private daysBetween(start: string, end: string) {
    const startTime = new Date(`${start}T00:00:00`).getTime();
    const endTime = new Date(`${end}T00:00:00`).getTime();
    return Math.max(0, Math.floor((endTime - startTime) / 86_400_000));
  }

  private dateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private sum<T>(items: T[], read: (item: T) => number) {
    return this.money(
      items.reduce((total, item) => total + Number(read(item) ?? 0), 0),
    );
  }

  private integerSum<T>(items: T[], read: (item: T) => number) {
    return items.reduce((total, item) => total + Number(read(item) ?? 0), 0);
  }

  private money(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
}
