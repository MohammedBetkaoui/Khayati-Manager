import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOperator,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import {
  ExpenseCategory,
  ExpenseSourceType,
  ExpenseStatus,
  ExpenseType,
  LegacyDebtStatus,
  LegacyDebtType,
  PaymentMethod,
  PayrollStatus,
} from '../common/enums';
import { SupplierAdvance } from '../inventory/entities/supplier-advance.entity';
import { SupplierPayment } from '../inventory/entities/supplier-payment.entity';
import { SupplierPurchase } from '../inventory/entities/supplier-purchase.entity';
import { Payroll } from '../payroll/entities/payroll.entity';
import { SalaryPayment } from '../payroll/entities/salary-payment.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { LegacyDebtsService } from '../legacy-debts/legacy-debts.service';
import { LegacyDebtPayment } from '../legacy-debts/entities/legacy-debt-payment.entity';
import { LegacyDebt } from '../legacy-debts/entities/legacy-debt.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import {
  ExpenseFilterDto,
  ExpenseLanguage,
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
  affectsCharges: boolean;
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
    private readonly legacyDebtsService: LegacyDebtsService,
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
    const language = filters.lang ?? ExpenseLanguage.FR;
    const range = this.resolveRange(filters);
    const sourceRange = this.requiredSourceRange(range);
    const sourceDate = this.dateOperator(sourceRange);
    const today = this.todayKey();
    const alertLimit = 8;
    const [
      manualExpenses,
      purchases,
      payrolls,
      supplierPayments,
      supplierAdvances,
      salaryPayments,
      invoices,
      legacyPayments,
      legacyDebts,
      openPurchases,
      openPayrolls,
      openManualExpenses,
      dueRecurringExpenses,
    ] =
      await Promise.all([
        this.expenseRepository.find({
          where: {
            archivedAt: IsNull(),
            ...(sourceDate ? { date: sourceDate } : {}),
          },
          order: { date: 'DESC', id: 'DESC' },
        }),
        this.purchaseRepository.find({
          where: sourceDate ? { purchaseDate: sourceDate } : {},
          relations: { supplier: true },
          order: { purchaseDate: 'DESC', id: 'DESC' },
        }),
        this.payrollRepository.find({
          where: sourceDate ? { periodEnd: sourceDate } : {},
          relations: { worker: true },
          order: { periodEnd: 'DESC', id: 'DESC' },
        }),
        this.supplierPaymentRepository.find({
          where: sourceDate ? { date: sourceDate } : {},
          relations: { supplier: true, purchase: true },
        }),
        this.supplierAdvanceRepository.find({
          where: sourceDate ? { date: sourceDate } : {},
          relations: { supplier: true },
        }),
        this.salaryPaymentRepository.find({
          where: sourceDate ? { date: sourceDate } : {},
          relations: { payroll: true, worker: true },
        }),
        this.invoiceRepository.find({
          where: sourceDate ? { date: sourceDate } : {},
        }),
        this.legacyDebtsService.getAllPayments(sourceRange),
        this.legacyDebtsService.getAllDebts(),
        this.purchaseRepository.find({
          where: { remainingAmount: MoreThan(0) },
          relations: { supplier: true },
          order: { remainingAmount: 'DESC', id: 'DESC' },
          take: alertLimit,
        }),
        this.payrollRepository.find({
          where: {
            remainingAmount: MoreThan(0),
            status: Not(PayrollStatus.CANCELLED),
          },
          relations: { worker: true },
          order: { remainingAmount: 'DESC', id: 'DESC' },
          take: alertLimit,
        }),
        this.expenseRepository.find({
          where: {
            archivedAt: IsNull(),
            remainingAmount: MoreThan(0),
            status: Not(ExpenseStatus.CANCELLED),
          },
          order: { remainingAmount: 'DESC', id: 'DESC' },
          take: alertLimit,
        }),
        this.expenseRepository.find({
          where: {
            archivedAt: IsNull(),
            isRecurring: true,
            nextDueDate: LessThanOrEqual(this.addDays(today, 7)),
            status: Not(ExpenseStatus.PAID),
          },
          order: { nextDueDate: 'ASC', id: 'ASC' },
          take: alertLimit,
        }),
      ]);

    const rows = [
      ...purchases.map((purchase) => this.serializePurchaseExpense(purchase, language)),
      ...payrolls
        .filter((payroll) => payroll.status !== 'CANCELLED')
        .map((payroll) => this.serializePayrollExpense(payroll, language)),
      ...manualExpenses.map((expense) => this.serializeManualExpense(expense, language)),
      ...legacyPayments
        .filter(
          (payment) =>
            payment.legacyDebt.type === LegacyDebtType.SUPPLIER_PAYABLE,
        )
        .map((payment) =>
          this.serializeLegacySupplierPayment(payment, language),
        ),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    const periodRows = rows.filter((row) => this.isInRange(row.date, range));
    const data = this.applyFilters(periodRows, filters);
    const alertRows = this.uniqueRows([
      ...rows,
      ...openPurchases.map((purchase) =>
        this.serializePurchaseExpense(purchase, language),
      ),
      ...openPayrolls.map((payroll) =>
        this.serializePayrollExpense(payroll, language),
      ),
      ...openManualExpenses.map((expense) =>
        this.serializeManualExpense(expense, language),
      ),
      ...dueRecurringExpenses.map((expense) =>
        this.serializeManualExpense(expense, language),
      ),
    ]);

    return {
      data,
      stats: this.buildStats(rows, range, {
        supplierPayments,
        supplierAdvances,
        salaryPayments,
        manualExpenses,
        invoices,
        legacyPayments,
        legacyDebts,
      }),
      alerts: this.buildAlerts(alertRows, language, legacyDebts),
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

  private serializePurchaseExpense(
    purchase: SupplierPurchase,
    language = ExpenseLanguage.FR,
  ): UnifiedExpenseRow {
    const supplier = purchase.supplier;
    const totalAmount = this.money(purchase.totalAmount);
    const paidAmount = this.money(purchase.paidAmount);
    const remainingAmount = this.money(Math.max(0, purchase.remainingAmount));
    return {
      id: `purchase-${purchase.id}`,
      sourceId: purchase.id,
      sourceType: ExpenseSourceType.SUPPLIER_PURCHASE,
      date: this.dateKey(purchase.purchaseDate),
      description: `${language === ExpenseLanguage.AR ? 'شراء' : 'Achat'} ${purchase.materialName}${purchase.materialColor ? ` - ${purchase.materialColor}` : ''}`,
      category: ExpenseCategory.MATERIAL_PURCHASE,
      originLabel: language === ExpenseLanguage.AR ? 'شراء من مورد' : 'Achat fournisseur',
      relatedName: supplier?.name ?? (language === ExpenseLanguage.AR ? 'مورد' : 'Fournisseur'),
      totalAmount,
      paidAmount,
      remainingAmount,
      status: this.deriveStatus(totalAmount, paidAmount, remainingAmount),
      paymentMethod: null,
      notes: purchase.notes ?? null,
      supplierId: supplier?.id ?? null,
      route: supplier?.id ? `/suppliers/${supplier.id}` : null,
      canEdit: false,
      affectsCharges: true,
    };
  }

  private serializePayrollExpense(
    payroll: Payroll,
    language = ExpenseLanguage.FR,
  ): UnifiedExpenseRow {
    const worker = payroll.worker;
    const totalAmount = this.money(payroll.grossAmount);
    const paidAmount = this.money(
      Math.min(totalAmount, (payroll.paidAmount ?? 0) + (payroll.advanceDeduction ?? 0)),
    );
    const remainingAmount = this.money(Math.max(0, totalAmount - paidAmount));
    const workerName = worker?.fullName ?? (language === ExpenseLanguage.AR ? 'عامل' : 'Travailleur');

    return {
      id: `payroll-${payroll.id}`,
      sourceId: payroll.id,
      sourceType: ExpenseSourceType.PAYROLL,
      date: this.dateKey(payroll.periodEnd),
      description: `${language === ExpenseLanguage.AR ? 'راتب' : 'Salaire'} ${workerName} (${this.displayDate(payroll.periodStart, language)} - ${this.displayDate(payroll.periodEnd, language)})`,
      category: ExpenseCategory.WORKER_SALARIES,
      originLabel: language === ExpenseLanguage.AR ? 'تسيير الرواتب' : 'Gestion des salaires',
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
      affectsCharges: true,
    };
  }

  private serializeManualExpense(
    expense: Expense,
    language = ExpenseLanguage.FR,
  ): UnifiedExpenseRow {
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
      originLabel: expense.isRecurring
        ? language === ExpenseLanguage.AR
          ? 'متكرر'
          : 'Récurrent'
        : language === ExpenseLanguage.AR
          ? 'يدوي'
          : 'Manuel',
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
      affectsCharges: true,
    };
  }

  private serializeLegacySupplierPayment(
    payment: LegacyDebtPayment,
    language = ExpenseLanguage.FR,
  ): UnifiedExpenseRow {
    const supplier = payment.legacyDebt.supplier;
    const amount = this.money(payment.amount);
    return {
      id: `legacy-supplier-payment-${payment.id}`,
      sourceId: payment.id,
      sourceType: ExpenseSourceType.SUPPLIER_LEGACY_PAYMENT,
      date: this.dateKey(payment.paymentDate),
      description:
        language === ExpenseLanguage.AR
          ? `تسديد دين سابق للمورد ${supplier?.name ?? ''}`.trim()
          : `Règlement d'une dette fournisseur antérieure${supplier?.name ? ` - ${supplier.name}` : ''}`,
      category: ExpenseCategory.OTHER,
      originLabel:
        language === ExpenseLanguage.AR ? 'دين سابق' : 'Solde antérieur',
      relatedName: supplier?.name ?? null,
      totalAmount: amount,
      paidAmount: amount,
      remainingAmount: 0,
      status: ExpenseStatus.PAID,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes ?? null,
      supplierId: supplier?.id ?? null,
      route: supplier?.id ? `/suppliers/${supplier.id}` : null,
      canEdit: false,
      affectsCharges: false,
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
      legacyPayments: LegacyDebtPayment[];
      legacyDebts: LegacyDebt[];
    },
  ) {
    const today = this.todayKey();
    const currentMonth = this.monthRange(today);
    const periodRows = rows.filter((row) => this.isInRange(row.date, range));
    const monthRows = rows.filter((row) => this.isInRange(row.date, currentMonth));

    const paidToday = this.money(this.sumPaidOut(sources, { start: today, end: today }));
    const periodPaid = this.money(this.sumPaidOut(sources, range));
    const periodCharges = this.sumRows(
      periodRows.filter((row) => row.affectsCharges),
      'totalAmount',
    );
    const monthCharges = this.sumRows(
      monthRows.filter((row) => row.affectsCharges),
      'totalAmount',
    );
    const legacySupplierRemaining = this.money(
      sources.legacyDebts
        .filter(
          (debt) =>
            debt.type === LegacyDebtType.SUPPLIER_PAYABLE &&
            debt.status !== LegacyDebtStatus.CANCELLED,
        )
        .reduce((sum, debt) => sum + Number(debt.remainingAmount ?? 0), 0),
    );
    const remaining = this.money(
      this.sumRows(periodRows, 'remainingAmount') + legacySupplierRemaining,
    );
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
      legacySupplierDebtRemaining: legacySupplierRemaining,
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

  private buildAlerts(
    rows: UnifiedExpenseRow[],
    language = ExpenseLanguage.FR,
    legacyDebts: LegacyDebt[] = [],
  ) {
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
        message:
          language === ExpenseLanguage.AR
            ? `${row.remainingAmount.toLocaleString('ar-DZ')} دج متبقية للدفع`
            : `${row.remainingAmount.toLocaleString('fr-FR')} DZD restant à payer`,
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
      .map((row) => {
        const dueDate = row.nextDueDate as string;
        const isOverdue = dueDate < today;

        return {
          id: `${row.id}-due`,
          type: row.sourceType,
          severity: isOverdue ? 'high' : 'low',
          title: row.description,
          message: isOverdue
            ? language === ExpenseLanguage.AR
              ? `فات موعد الاستحقاق منذ ${this.displayDate(dueDate, language)}`
              : `Échéance en retard depuis ${dueDate}`
            : language === ExpenseLanguage.AR
              ? `موعد الاستحقاق القادم ${this.displayDate(dueDate, language)}`
              : `Échéance prochaine le ${dueDate}`,
          amount: row.remainingAmount || row.totalAmount,
          route: null,
        };
      });

    const legacyDebtAlerts = legacyDebts
      .filter(
        (debt) =>
          debt.type === LegacyDebtType.SUPPLIER_PAYABLE &&
          debt.status !== LegacyDebtStatus.CANCELLED &&
          debt.remainingAmount > 0,
      )
      .sort((left, right) => right.remainingAmount - left.remainingAmount)
      .slice(0, 3)
      .map((debt) => ({
        id: `legacy-supplier-debt-${debt.id}-alert`,
        type: ExpenseSourceType.SUPPLIER_LEGACY_PAYMENT,
        severity: 'medium',
        title:
          debt.supplier?.name ??
          (language === ExpenseLanguage.AR ? 'مورد' : 'Fournisseur'),
        message:
          language === ExpenseLanguage.AR
            ? `${debt.remainingAmount.toLocaleString('ar-DZ')} دج مستحقة للمورد على الورشة من دين سابق`
            : `${debt.remainingAmount.toLocaleString('fr-FR')} DZD restant sur une dette fournisseur antérieure`,
        amount: debt.remainingAmount,
        route: debt.supplier?.id ? `/suppliers/${debt.supplier.id}` : null,
      }));

    return [...recurringAlerts, ...legacyDebtAlerts, ...debtAlerts].slice(0, 6);
  }

  private buildReports(rows: UnifiedExpenseRow[], allRows: UnifiedExpenseRow[]) {
    const chargeRows = rows.filter((row) => row.affectsCharges);
    const total = this.sumRows(chargeRows, 'totalAmount') || 1;
    const categoryMap = new Map<ExpenseCategory, number>();
    for (const row of chargeRows) {
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
        charges: this.sumRows(
          monthRows.filter((row) => row.affectsCharges),
          'totalAmount',
        ),
        paid: this.sumRows(
          monthRows.filter(
            (row) =>
              row.affectsCharges ||
              row.sourceType === ExpenseSourceType.SUPPLIER_LEGACY_PAYMENT,
          ),
          'paidAmount',
        ),
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
      legacyPayments: LegacyDebtPayment[];
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

    const legacySupplierPayments = sources.legacyPayments
      .filter(
        (payment) =>
          payment.legacyDebt.type === LegacyDebtType.SUPPLIER_PAYABLE &&
          this.isInRange(payment.paymentDate, range),
      )
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

    return (
      supplierPayments +
      supplierAdvances +
      salaryPayments +
      manualPayments +
      legacySupplierPayments
    );
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

  private requiredSourceRange(selectedRange: DateRange): DateRange {
    if (!selectedRange.start && !selectedRange.end) return {};

    const today = this.todayKey();
    const currentMonth = this.monthRange(today);
    const reportStart = `${this.lastMonths(6)[0]}-01`;
    const starts = [selectedRange.start, currentMonth.start, reportStart, today]
      .filter((value): value is string => Boolean(value))
      .sort();
    const ends = [selectedRange.end, currentMonth.end, today]
      .filter((value): value is string => Boolean(value))
      .sort();

    return { start: starts[0], end: ends.at(-1) };
  }

  private dateOperator(range: DateRange): FindOperator<string> | undefined {
    if (range.start && range.end) return Between(range.start, range.end);
    if (range.start) return MoreThanOrEqual(range.start);
    if (range.end) return LessThanOrEqual(range.end);
    return undefined;
  }

  private uniqueRows(rows: UnifiedExpenseRow[]) {
    return [...new Map(rows.map((row) => [row.id, row])).values()];
  }

  private displayDate(value: Date | string, language: ExpenseLanguage) {
    const date = new Date(`${this.dateKey(value)}T00:00:00`);
    return new Intl.DateTimeFormat(
      language === ExpenseLanguage.AR ? 'ar-DZ' : 'fr-FR',
      { day: '2-digit', month: '2-digit', year: 'numeric' },
    ).format(date);
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
