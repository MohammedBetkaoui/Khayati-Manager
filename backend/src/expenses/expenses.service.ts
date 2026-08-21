import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  ExpenseCategory,
  ExpenseSourceType,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
} from '../common/enums';
import { SupplierAdvance } from '../inventory/entities/supplier-advance.entity';
import { SupplierPayment } from '../inventory/entities/supplier-payment.entity';
import { SupplierPurchase } from '../inventory/entities/supplier-purchase.entity';
import { Payroll } from '../payroll/entities/payroll.entity';
import { SalaryPayment } from '../payroll/entities/salary-payment.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import {
  ExpenseFilterDto,
  ExpensePeriodFilter,
  ExpenseTabFilter,
} from './dto/expense-filter.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense } from './entities/expense.entity';

type DateRange = { start?: string; end?: string };

type UnifiedExpenseRow = {
  id: string;
  sourceId: number;
  sourceType: ExpenseSourceType;
  date: string;
  description: string;
  category: ExpenseCategory;
  originLabel: string;
  relatedName?: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: ExpenseStatus;
  paymentMethod?: string | null;
  notes?: string | null;
  supplierId?: number | null;
  workerId?: number | null;
  payrollId?: number | null;
  route?: string | null;
  canEdit: boolean;
  isRecurring?: boolean;
  nextDueDate?: string | null;
};

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(SupplierPurchase)
    private readonly purchaseRepository: Repository<SupplierPurchase>,
    @InjectRepository(SupplierPayment)
    private readonly supplierPaymentRepository: Repository<SupplierPayment>,
    @InjectRepository(SupplierAdvance)
    private readonly supplierAdvanceRepository: Repository<SupplierAdvance>,
    @InjectRepository(Payroll)
    private readonly payrollRepository: Repository<Payroll>,
    @InjectRepository(SalaryPayment)
    private readonly salaryPaymentRepository: Repository<SalaryPayment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async create(dto: CreateExpenseDto) {
    const totalAmount = this.money(dto.totalAmount);
    const paidAmount = this.money(dto.paidAmount ?? totalAmount);
    this.assertAmounts(totalAmount, paidAmount);

    const isRecurring = Boolean(dto.isRecurring);
    const remainingAmount = this.money(totalAmount - paidAmount);
    const expense = this.expenseRepository.create({
      name: dto.description.trim(),
      category: dto.category,
      type: dto.type ?? (isRecurring ? ExpenseType.RECURRING : ExpenseType.VARIABLE),
      amount: totalAmount,
      paidAmount,
      remainingAmount,
      status:
        dto.status ??
        this.deriveStatus(totalAmount, paidAmount, remainingAmount, dto.nextDueDate),
      sourceType: isRecurring ? ExpenseSourceType.RECURRING : ExpenseSourceType.MANUAL,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
      date: this.dateKey(dto.expenseDate),
      linkedTo: 'expenses',
      isRecurring,
      frequency: dto.frequency ?? null,
      nextDueDate: dto.nextDueDate ? this.dateKey(dto.nextDueDate) : null,
      startDate: dto.startDate ? this.dateKey(dto.startDate) : null,
      endDate: dto.endDate ? this.dateKey(dto.endDate) : null,
      notes: dto.notes?.trim() || null,
    });

    const saved = await this.expenseRepository.save(expense);
    return this.serializeManualExpense(saved);
  }

  async findAll(filters: ExpenseFilterDto = {}) {
    const [manualExpenses, purchases, payrolls, supplierPayments, supplierAdvances, salaryPayments, invoices] =
      await Promise.all([
        this.expenseRepository.find({ where: { archivedAt: IsNull() }, order: { date: 'DESC', id: 'DESC' } }),
        this.purchaseRepository.find({
          relations: { supplier: true },
          order: { purchaseDate: 'DESC', id: 'DESC' },
        }),
        this.payrollRepository.find({
          relations: { worker: true },
          order: { periodEnd: 'DESC', id: 'DESC' },
        }),
        this.supplierPaymentRepository.find({ relations: { supplier: true, purchase: true } }),
        this.supplierAdvanceRepository.find({ relations: { supplier: true } }),
        this.salaryPaymentRepository.find({ relations: { payroll: true, worker: true } }),
        this.invoiceRepository.find(),
      ]);

    const rows = [
      ...purchases.map((purchase) => this.serializePurchaseExpense(purchase)),
      ...payrolls
        .filter((payroll) => payroll.status !== 'CANCELLED')
        .map((payroll) => this.serializePayrollExpense(payroll)),
      ...manualExpenses.map((expense) => this.serializeManualExpense(expense)),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    const range = this.resolveRange(filters);
    const periodRows = rows.filter((row) => this.isInRange(row.date, range));
    const data = this.applyFilters(periodRows, filters);

    return {
      data,
      stats: this.buildStats(rows, range, {
        supplierPayments,
        supplierAdvances,
        salaryPayments,
        manualExpenses,
        invoices,
      }),
      alerts: this.buildAlerts(rows),
      reports: this.buildReports(periodRows, rows),
      filters: {
        period: filters.period ?? ExpensePeriodFilter.MONTH,
        startDate: range.start ?? null,
        endDate: range.end ?? null,
      },
      pagination: {
        page: 1,
        limit: data.length,
        total: data.length,
      },
    };
  }

  async findOne(id: number) {
    const expense = await this.getManualExpense(id);
    return this.serializeManualExpense(expense);
  }

  async update(id: number, dto: UpdateExpenseDto) {
    const expense = await this.getManualExpense(id);
    const totalAmount = this.money(dto.totalAmount ?? expense.amount);
    const paidAmount = this.money(dto.paidAmount ?? expense.paidAmount ?? totalAmount);
    this.assertAmounts(totalAmount, paidAmount);

    const isRecurring = dto.isRecurring ?? expense.isRecurring;
    const remainingAmount = this.money(totalAmount - paidAmount);

    Object.assign(expense, {
      name: dto.description?.trim() ?? expense.name,
      category: dto.category ?? expense.category,
      type: dto.type ?? (isRecurring ? ExpenseType.RECURRING : expense.type),
      amount: totalAmount,
      paidAmount,
      remainingAmount,
      status:
        dto.status ??
        this.deriveStatus(
          totalAmount,
          paidAmount,
          remainingAmount,
          dto.nextDueDate ?? expense.nextDueDate ?? undefined,
        ),
      paymentMethod: dto.paymentMethod ?? expense.paymentMethod,
      date: dto.expenseDate ? this.dateKey(dto.expenseDate) : expense.date,
      sourceType: isRecurring ? ExpenseSourceType.RECURRING : ExpenseSourceType.MANUAL,
      isRecurring,
      frequency: dto.frequency ?? expense.frequency ?? null,
      nextDueDate: dto.nextDueDate ? this.dateKey(dto.nextDueDate) : expense.nextDueDate ?? null,
      startDate: dto.startDate ? this.dateKey(dto.startDate) : expense.startDate ?? null,
      endDate: dto.endDate ? this.dateKey(dto.endDate) : expense.endDate ?? null,
      notes: dto.notes?.trim() ?? expense.notes ?? null,
    });

    const saved = await this.expenseRepository.save(expense);
    return this.serializeManualExpense(saved);
  }

  async remove(id: number) {
    const expense = await this.getManualExpense(id);
    expense.archivedAt = new Date();
    await this.expenseRepository.save(expense);
    return { success: true };
  }

  private async getManualExpense(id: number) {
    const expense = await this.expenseRepository.findOne({ where: { id, archivedAt: IsNull() } });
    if (!expense) {
      throw new NotFoundException(`Expense #${id} not found.`);
    }
    return expense;
  }

  private serializePurchaseExpense(purchase: SupplierPurchase): UnifiedExpenseRow {
    const supplier = purchase.supplier;
    const totalAmount = this.money(purchase.totalAmount);
    const paidAmount = this.money(purchase.paidAmount);
    const remainingAmount = this.money(Math.max(0, purchase.remainingAmount));
    return {
      id: `purchase-${purchase.id}`,
      sourceId: purchase.id,
      sourceType: ExpenseSourceType.SUPPLIER_PURCHASE,
      date: this.dateKey(purchase.purchaseDate),
      description: `Achat ${purchase.materialName}${purchase.materialColor ? ` - ${purchase.materialColor}` : ''}`,
      category: ExpenseCategory.MATERIAL_PURCHASE,
      originLabel: 'Achat fournisseur',
      relatedName: supplier?.name ?? 'Fournisseur',
      totalAmount,
      paidAmount,
      remainingAmount,
      status: this.deriveStatus(totalAmount, paidAmount, remainingAmount),
      paymentMethod: null,
      notes: purchase.notes ?? null,
      supplierId: supplier?.id ?? null,
      route: supplier?.id ? `/suppliers/${supplier.id}` : null,
      canEdit: false,
    };
  }

  private serializePayrollExpense(payroll: Payroll): UnifiedExpenseRow {
    const worker = payroll.worker;
    const totalAmount = this.money(payroll.grossAmount);
    const paidAmount = this.money(
      Math.min(totalAmount, (payroll.paidAmount ?? 0) + (payroll.advanceDeduction ?? 0)),
    );
    const remainingAmount = this.money(Math.max(0, totalAmount - paidAmount));
    const workerName = worker?.fullName ?? 'Travailleur';

    return {
      id: `payroll-${payroll.id}`,
      sourceId: payroll.id,
      sourceType: ExpenseSourceType.PAYROLL,
      date: this.dateKey(payroll.periodEnd),
      description: `Salaire ${workerName} (${this.dateKey(payroll.periodStart)} - ${this.dateKey(payroll.periodEnd)})`,
      category: ExpenseCategory.WORKER_SALARIES,
      originLabel: 'Gestion des salaires',
      relatedName: workerName,
      totalAmount,
      paidAmount,
      remainingAmount,
      status: this.deriveStatus(totalAmount, paidAmount, remainingAmount),
      paymentMethod: null,
      notes: payroll.notes ?? null,
      workerId: worker?.id ?? null,
      payrollId: payroll.id,
      route: worker?.id ? `/worker-profile?workerId=${worker.id}` : null,
      canEdit: false,
    };
  }

  private serializeManualExpense(expense: Expense): UnifiedExpenseRow {
    const totalAmount = this.money(expense.amount);
    const paidAmount = this.money(expense.paidAmount ?? totalAmount);
    const remainingAmount = this.money(
      expense.remainingAmount ?? Math.max(0, totalAmount - paidAmount),
    );
    return {
      id: `manual-${expense.id}`,
      sourceId: expense.id,
      sourceType: expense.isRecurring ? ExpenseSourceType.RECURRING : ExpenseSourceType.MANUAL,
      date: this.dateKey(expense.date),
      description: expense.name,
      category: expense.category,
      originLabel: expense.isRecurring ? 'Récurrent' : 'Manuel',
      relatedName: expense.supplier ?? null,
      totalAmount,
      paidAmount,
      remainingAmount,
      status: expense.status ?? this.deriveStatus(totalAmount, paidAmount, remainingAmount, expense.nextDueDate ?? undefined),
      paymentMethod: expense.paymentMethod,
      notes: expense.notes ?? null,
      route: null,
      canEdit: true,
      isRecurring: expense.isRecurring,
      nextDueDate: expense.nextDueDate ?? null,
    };
  }

  private applyFilters(rows: UnifiedExpenseRow[], filters: ExpenseFilterDto) {
    return rows.filter((row) => {
      if (filters.tab === ExpenseTabFilter.PURCHASES && row.sourceType !== ExpenseSourceType.SUPPLIER_PURCHASE) return false;
      if (filters.tab === ExpenseTabFilter.PAYROLL && row.sourceType !== ExpenseSourceType.PAYROLL) return false;
      if (filters.tab === ExpenseTabFilter.MANUAL && row.sourceType !== ExpenseSourceType.MANUAL) return false;
      if (filters.tab === ExpenseTabFilter.RECURRING && row.sourceType !== ExpenseSourceType.RECURRING) return false;
      if (filters.category && row.category !== filters.category) return false;
      if (filters.status && row.status !== filters.status) return false;
      if (filters.origin && row.sourceType !== filters.origin) return false;

      const search = filters.search?.trim().toLowerCase();
      if (search) {
        const haystack = [
          row.description,
          row.category,
          row.originLabel,
          row.relatedName,
          row.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }

  private buildStats(
    rows: UnifiedExpenseRow[],
    range: DateRange,
    sources: {
      supplierPayments: SupplierPayment[];
      supplierAdvances: SupplierAdvance[];
      salaryPayments: SalaryPayment[];
      manualExpenses: Expense[];
      invoices: Invoice[];
    },
  ) {
    const today = this.todayKey();
    const currentMonth = this.monthRange(today);
    const periodRows = rows.filter((row) => this.isInRange(row.date, range));
    const monthRows = rows.filter((row) => this.isInRange(row.date, currentMonth));

    const paidToday = this.money(this.sumPaidOut(sources, { start: today, end: today }));
    const periodPaid = this.money(this.sumPaidOut(sources, range));
    const periodCharges = this.sumRows(periodRows, 'totalAmount');
    const monthCharges = this.sumRows(monthRows, 'totalAmount');
    const remaining = this.sumRows(periodRows, 'remainingAmount');
    const payrollMonth = this.sumRows(
      monthRows.filter((row) => row.sourceType === ExpenseSourceType.PAYROLL),
      'totalAmount',
    );
    const sales = this.money(
      sources.invoices
        .filter((invoice) => this.isInRange(invoice.date, range))
        .reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0),
    );

    return {
      todayPaid: paidToday,
      monthCharges,
      periodCharges,
      periodPaid,
      remainingToPay: remaining,
      payrollMonth,
      estimatedSales: sales,
      estimatedResult: this.money(sales - periodCharges),
      supplierPurchases: this.sumRows(
        periodRows.filter((row) => row.sourceType === ExpenseSourceType.SUPPLIER_PURCHASE),
        'totalAmount',
      ),
      manualCharges: this.sumRows(
        periodRows.filter((row) => row.sourceType === ExpenseSourceType.MANUAL || row.sourceType === ExpenseSourceType.RECURRING),
        'totalAmount',
      ),
    };
  }

  private buildAlerts(rows: UnifiedExpenseRow[]) {
    const today = this.todayKey();
    const inSevenDays = this.addDays(today, 7);

    const debtAlerts = rows
      .filter((row) => row.remainingAmount > 0 && row.status !== ExpenseStatus.CANCELLED)
      .sort((a, b) => b.remainingAmount - a.remainingAmount)
      .slice(0, 4)
      .map((row) => ({
        id: `${row.id}-debt`,
        type: row.sourceType,
        severity: row.status === ExpenseStatus.OVERDUE ? 'high' : 'medium',
        title: row.relatedName || row.description,
        message: `${row.remainingAmount.toLocaleString('fr-FR')} DZD restant à payer`,
        amount: row.remainingAmount,
        route: row.route,
      }));

    const recurringAlerts = rows
      .filter(
        (row) =>
          row.sourceType === ExpenseSourceType.RECURRING &&
          row.nextDueDate &&
          row.nextDueDate <= inSevenDays &&
          row.status !== ExpenseStatus.PAID,
      )
      .slice(0, 3)
      .map((row) => ({
        id: `${row.id}-due`,
        type: row.sourceType,
        severity: row.nextDueDate && row.nextDueDate < today ? 'high' : 'low',
        title: row.description,
        message:
          row.nextDueDate && row.nextDueDate < today
            ? `Échéance en retard depuis ${row.nextDueDate}`
            : `Échéance prochaine le ${row.nextDueDate}`,
        amount: row.remainingAmount || row.totalAmount,
        route: null,
      }));

    return [...recurringAlerts, ...debtAlerts].slice(0, 6);
  }

  private buildReports(rows: UnifiedExpenseRow[], allRows: UnifiedExpenseRow[]) {
    const total = this.sumRows(rows, 'totalAmount') || 1;
    const categoryMap = new Map<ExpenseCategory, number>();
    for (const row of rows) {
      categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + row.totalAmount);
    }

    const categoryBreakdown = [...categoryMap.entries()]
      .map(([category, amount]) => ({
        category,
        amount: this.money(amount),
        percentage: this.money((amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    const monthlyTrend = this.lastMonths(6).map((month) => {
      const monthRows = allRows.filter((row) => row.date.startsWith(month));
      return {
        month,
        charges: this.sumRows(monthRows, 'totalAmount'),
        paid: this.sumRows(monthRows, 'paidAmount'),
        remaining: this.sumRows(monthRows, 'remainingAmount'),
      };
    });

    return {
      categoryBreakdown,
      monthlyTrend,
    };
  }

  private sumPaidOut(
    sources: {
      supplierPayments: SupplierPayment[];
      supplierAdvances: SupplierAdvance[];
      salaryPayments: SalaryPayment[];
      manualExpenses: Expense[];
    },
    range: DateRange,
  ) {
    const supplierPayments = sources.supplierPayments
      .filter((payment) => this.isInRange(payment.date, range))
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
    const supplierAdvances = sources.supplierAdvances
      .filter((advance) => this.isInRange(advance.date, range))
      .reduce((sum, advance) => sum + Number(advance.amount ?? 0), 0);
    const salaryPayments = sources.salaryPayments
      .filter((payment) => this.isInRange(payment.date, range))
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
    const manualPayments = sources.manualExpenses
      .filter((expense) => this.isInRange(expense.date, range))
      .reduce((sum, expense) => sum + Number(expense.paidAmount ?? expense.amount ?? 0), 0);

    return supplierPayments + supplierAdvances + salaryPayments + manualPayments;
  }

  private resolveRange(filters: ExpenseFilterDto): DateRange {
    const today = this.todayKey();
    const period = filters.period ?? ExpensePeriodFilter.MONTH;

    if (period === ExpensePeriodFilter.ALL) return {};
    if (period === ExpensePeriodFilter.CUSTOM) {
      return {
        start: filters.startDate ? this.dateKey(filters.startDate) : undefined,
        end: filters.endDate ? this.dateKey(filters.endDate) : undefined,
      };
    }
    if (period === ExpensePeriodFilter.TODAY) return { start: today, end: today };
    if (period === ExpensePeriodFilter.WEEK) return this.weekRange(today);
    if (period === ExpensePeriodFilter.PREVIOUS_MONTH) {
      const date = new Date(`${today}T00:00:00`);
      date.setMonth(date.getMonth() - 1);
      return this.monthRange(this.dateKey(date));
    }
    return this.monthRange(today);
  }

  private deriveStatus(
    totalAmount: number,
    paidAmount: number,
    remainingAmount: number,
    dueDate?: string,
  ) {
    const today = this.todayKey();
    if (dueDate && dueDate < today && remainingAmount > 0) return ExpenseStatus.OVERDUE;
    if (dueDate && dueDate > today && paidAmount <= 0) return ExpenseStatus.UPCOMING;
    if (remainingAmount <= 0 || paidAmount >= totalAmount) return ExpenseStatus.PAID;
    if (paidAmount > 0) return ExpenseStatus.PARTIALLY_PAID;
    return ExpenseStatus.UNPAID;
  }

  private assertAmounts(totalAmount: number, paidAmount: number) {
    if (paidAmount > totalAmount) {
      throw new BadRequestException('Paid amount cannot be greater than total amount.');
    }
  }

  private isInRange(date: string | Date | null | undefined, range: DateRange) {
    const key = this.dateKey(date);
    if (!key) return false;
    if (range.start && key < range.start) return false;
    if (range.end && key > range.end) return false;
    return true;
  }

  private sumRows(rows: UnifiedExpenseRow[], key: 'totalAmount' | 'paidAmount' | 'remainingAmount') {
    return this.money(rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0));
  }

  private monthRange(dateKey: string): DateRange {
    const month = dateKey.slice(0, 7);
    const date = new Date(`${month}-01T00:00:00`);
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    return { start: `${month}-01`, end: this.dateKey(end) };
  }

  private weekRange(dateKey: string): DateRange {
    const date = new Date(`${dateKey}T00:00:00`);
    const day = date.getDay() || 7;
    const start = new Date(date);
    start.setDate(date.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: this.dateKey(start), end: this.dateKey(end) };
  }

  private lastMonths(count: number) {
    const months: string[] = [];
    const date = new Date(`${this.todayKey().slice(0, 7)}-01T00:00:00`);
    for (let index = count - 1; index >= 0; index -= 1) {
      const current = new Date(date);
      current.setMonth(date.getMonth() - index);
      months.push(this.dateKey(current).slice(0, 7));
    }
    return months;
  }

  private addDays(dateKey: string, days: number) {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days);
    return this.dateKey(date);
  }

  private todayKey() {
    return this.dateKey(new Date());
  }

  private dateKey(value: string | Date | null | undefined) {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private money(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
}
