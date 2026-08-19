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
  AdvanceType,
  BalanceStatus,
  LoanStatus,
  PayrollPaymentMethod,
  PayrollStatus,
  SalaryType,
  WorkerStatus,
} from '../common/enums';
import { Worker } from '../workers/entities/worker.entity';
import { CancelPayrollDto } from './dto/cancel-payroll.dto';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { CreateLoanRepaymentDto } from './dto/create-loan-repayment.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import {
  BalanceDeductionDto,
  CreatePayrollDto,
} from './dto/create-payroll.dto';
import { CreateSalaryPaymentDto } from './dto/create-salary-payment.dto';
import { PayrollFilterDto } from './dto/payroll-filter.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { Advance } from './entities/advance.entity';
import { LoanRepayment } from './entities/loan-repayment.entity';
import { Loan } from './entities/loan.entity';
import { PayrollAdvanceDeduction } from './entities/payroll-advance-deduction.entity';
import { PayrollLoanDeduction } from './entities/payroll-loan-deduction.entity';
import { Payroll } from './entities/payroll.entity';
import { SalaryPayment } from './entities/salary-payment.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

type PayrollValues = {
  periodStart: string;
  periodEnd: string;
  salaryMonth: string | null;
  salaryTypeSnapshot: SalaryType;
  monthlySalarySnapshot: number;
  installmentsInMonth: number;
  installmentNumber: number;
  piecesCompleted: number;
  piecePrice: number;
  grossAmount: number;
  otherDeductions: number;
};

@Injectable()
export class PayrollService implements OnModuleInit {
  constructor(
    @InjectRepository(Payroll)
    private readonly payrollRepository: Repository<Payroll>,
    @InjectRepository(SalaryPayment)
    private readonly paymentRepository: Repository<SalaryPayment>,
    @InjectRepository(Advance)
    private readonly advanceRepository: Repository<Advance>,
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    @InjectRepository(LoanRepayment)
    private readonly loanRepaymentRepository: Repository<LoanRepayment>,
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.migrateLegacyFinanceData();
  }

  async create(dto: CreatePayrollDto) {
    const payrollId = await this.dataSource.transaction(async (manager) => {
      const worker = await this.findWorkerOrFail(manager, dto.workerId);
      this.assertWorkerCanReceivePayroll(worker);
      await this.ensurePeriodAvailable(
        manager,
        worker.id,
        dto.periodStart,
        dto.periodEnd,
      );

      const values = await this.calculatePayrollValues(manager, worker, dto);
      const payroll = manager.create(Payroll, {
        worker,
        ...values,
        advanceDeduction: 0,
        loanDeduction: 0,
        amountDue: this.money(values.grossAmount - values.otherDeductions),
        paidAmount: 0,
        remainingAmount: this.money(
          values.grossAmount - values.otherDeductions,
        ),
        status: PayrollStatus.CALCULATED,
        notes: this.optionalText(dto.notes),
      });

      await manager.save(payroll);
      await this.applyBalanceDeductions(manager, payroll, worker, dto);
      await manager.save(payroll);
      return payroll.id;
    });

    return this.findOne(payrollId);
  }

  async findAll(query: PayrollFilterDto = {}) {
    const page = Math.max(DEFAULT_PAGE, Math.floor(Number(query.page) || 1));
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(query.limit) || DEFAULT_LIMIT)),
    );
    const qb = this.payrollRepository
      .createQueryBuilder('payroll')
      .leftJoinAndSelect('payroll.worker', 'worker')
      .leftJoinAndSelect('payroll.payments', 'payments')
      .where('1 = 1');

    if (query.search?.trim()) {
      qb.andWhere(
        '(worker.fullName LIKE :search OR worker.phone LIKE :search)',
        {
          search: `%${query.search.trim()}%`,
        },
      );
    }
    if (query.workerId) {
      qb.andWhere('worker.id = :workerId', { workerId: query.workerId });
    }
    if (query.salaryType) {
      qb.andWhere('payroll.salaryTypeSnapshot = :salaryType', {
        salaryType: query.salaryType,
      });
    }
    if (query.status) {
      qb.andWhere('payroll.status = :status', { status: query.status });
    }
    if (query.startDate) {
      qb.andWhere('payroll.periodEnd >= :startDate', {
        startDate: this.dateKey(query.startDate),
      });
    }
    if (query.endDate) {
      qb.andWhere('payroll.periodStart <= :endDate', {
        endDate: this.dateKey(query.endDate),
      });
    }

    qb.orderBy('payroll.periodEnd', 'DESC')
      .addOrderBy('payroll.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => this.serializePayroll(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: number) {
    const payroll = await this.payrollRepository.findOne({
      where: { id },
      relations: {
        worker: true,
        payments: true,
        advanceDeductions: { advance: true },
        loanDeductions: { loan: true },
      },
    });

    if (!payroll) {
      throw new NotFoundException(`Payroll with id ${id} was not found.`);
    }
    return this.serializePayroll(payroll);
  }

  async update(id: number, dto: UpdatePayrollDto) {
    await this.dataSource.transaction(async (manager) => {
      const payroll = await manager.findOne(Payroll, {
        where: { id },
        relations: {
          worker: true,
          payments: true,
          advanceDeductions: { advance: true },
          loanDeductions: { loan: true },
        },
      });
      if (!payroll) {
        throw new NotFoundException(`Payroll with id ${id} was not found.`);
      }
      if (payroll.status === PayrollStatus.CANCELLED) {
        throw new BadRequestException('A cancelled payroll cannot be edited.');
      }
      if (payroll.paidAmount > 0 || payroll.payments.length > 0) {
        throw new BadRequestException(
          'A payroll with payments cannot be recalculated. Use a corrective operation.',
        );
      }
      if (dto.workerId && dto.workerId !== payroll.worker.id) {
        throw new BadRequestException(
          'The worker of a payroll cannot be changed.',
        );
      }

      const existingAdvanceDeductions = payroll.advanceDeductions.map(
        (item) => ({
          id: item.advance.id,
          amount: item.amount,
        }),
      );
      const existingLoanDeductions = payroll.loanDeductions.map((item) => ({
        id: item.loan.id,
        amount: item.amount,
      }));
      await this.reverseBalanceDeductions(manager, payroll);
      const merged: CreatePayrollDto = {
        workerId: payroll.worker.id,
        periodStart: dto.periodStart ?? payroll.periodStart,
        periodEnd: dto.periodEnd ?? payroll.periodEnd,
        salaryMonth: dto.salaryMonth ?? payroll.salaryMonth ?? undefined,
        installmentsInMonth:
          dto.installmentsInMonth ?? payroll.installmentsInMonth,
        installmentNumber: dto.installmentNumber ?? payroll.installmentNumber,
        piecesCompleted: dto.piecesCompleted ?? payroll.piecesCompleted,
        piecePrice: dto.piecePrice ?? payroll.piecePrice,
        otherDeductions: dto.otherDeductions ?? payroll.otherDeductions,
        advanceDeductions: dto.advanceDeductions ?? existingAdvanceDeductions,
        loanDeductions: dto.loanDeductions ?? existingLoanDeductions,
        notes: dto.notes ?? payroll.notes ?? undefined,
      };

      await this.ensurePeriodAvailable(
        manager,
        payroll.worker.id,
        merged.periodStart,
        merged.periodEnd,
        payroll.id,
      );
      const values = await this.calculatePayrollValues(
        manager,
        payroll.worker,
        merged,
        payroll.id,
        {
          salaryType: payroll.salaryTypeSnapshot,
          monthlySalary: payroll.monthlySalarySnapshot,
        },
      );
      Object.assign(payroll, values, {
        advanceDeduction: 0,
        loanDeduction: 0,
        amountDue: this.money(values.grossAmount - values.otherDeductions),
        remainingAmount: this.money(
          values.grossAmount - values.otherDeductions,
        ),
        status: PayrollStatus.CALCULATED,
        notes: this.optionalText(merged.notes),
      });
      await manager.save(payroll);
      await this.applyBalanceDeductions(
        manager,
        payroll,
        payroll.worker,
        merged,
      );
      await manager.save(payroll);
    });

    return this.findOne(id);
  }

  async cancel(id: number, dto: CancelPayrollDto) {
    await this.dataSource.transaction(async (manager) => {
      const payroll = await manager.findOne(Payroll, {
        where: { id },
        relations: {
          payments: true,
          advanceDeductions: { advance: true },
          loanDeductions: { loan: true },
        },
      });
      if (!payroll) {
        throw new NotFoundException(`Payroll with id ${id} was not found.`);
      }
      if (payroll.status === PayrollStatus.CANCELLED) return;
      if (payroll.paidAmount > 0 || payroll.payments.length > 0) {
        throw new BadRequestException(
          'A payroll with payments cannot be cancelled silently.',
        );
      }
      await this.reverseBalanceDeductions(manager, payroll);
      payroll.status = PayrollStatus.CANCELLED;
      payroll.cancelledAt = new Date();
      payroll.cancellationReason = dto.reason.trim();
      payroll.remainingAmount = 0;
      await manager.save(payroll);
    });
    return this.findOne(id);
  }

  async createPayment(payrollId: number, dto: CreateSalaryPaymentDto) {
    const paymentId = await this.dataSource.transaction(async (manager) => {
      const payroll = await manager.findOne(Payroll, {
        where: { id: payrollId },
        relations: { worker: true },
      });
      if (!payroll) {
        throw new NotFoundException(
          `Payroll with id ${payrollId} was not found.`,
        );
      }
      if (payroll.status === PayrollStatus.CANCELLED) {
        throw new BadRequestException('A cancelled payroll cannot be paid.');
      }

      const amount = this.money(dto.amount);
      if (amount > this.money(payroll.remainingAmount)) {
        throw new BadRequestException(
          `Payment exceeds the remaining amount of ${payroll.remainingAmount}.`,
        );
      }

      const payment = manager.create(SalaryPayment, {
        payroll,
        worker: payroll.worker,
        amount,
        date: this.dateKey(dto.date),
        method: dto.method,
        reference: this.optionalText(dto.reference),
        notes: this.optionalText(dto.notes),
      });
      await manager.save(payment);

      payroll.paidAmount = this.money(payroll.paidAmount + amount);
      payroll.remainingAmount = this.money(
        payroll.amountDue - payroll.paidAmount,
      );
      payroll.status =
        payroll.remainingAmount <= 0
          ? PayrollStatus.PAID
          : PayrollStatus.PARTIALLY_PAID;
      await manager.save(payroll);
      return payment.id;
    });

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: { payroll: true, worker: true },
    });
    return this.serializePayment(payment!);
  }

  async createAdvance(dto: CreateAdvanceDto) {
    const worker = await this.findWorkerOrFail(
      this.dataSource.manager,
      dto.workerId,
    );
    this.assertWorkerCanReceivePayroll(worker);
    const amount = this.money(dto.amount);
    const advance = this.advanceRepository.create({
      worker,
      amount,
      deductedAmount: 0,
      remainingAmount: amount,
      date: this.dateKey(dto.date),
      type: dto.type ?? AdvanceType.SALARY,
      status: BalanceStatus.OPEN,
      notes: this.optionalText(dto.notes),
    });
    return this.serializeAdvance(await this.advanceRepository.save(advance));
  }

  async getAdvances(workerId?: number) {
    const rows = await this.advanceRepository.find({
      where: workerId ? { worker: { id: workerId } } : {},
      relations: { worker: true },
      order: { date: 'DESC', id: 'DESC' },
    });
    return { data: rows.map((row) => this.serializeAdvance(row)) };
  }

  async createLoan(dto: CreateLoanDto) {
    const worker = await this.findWorkerOrFail(
      this.dataSource.manager,
      dto.workerId,
    );
    this.assertWorkerCanReceivePayroll(worker);
    const amount = this.money(dto.amount);
    const loan = this.loanRepository.create({
      worker,
      initialAmount: amount,
      repaidAmount: 0,
      remainingAmount: amount,
      date: this.dateKey(dto.date),
      status: LoanStatus.OPEN,
      notes: this.optionalText(dto.notes),
    });
    return this.serializeLoan(await this.loanRepository.save(loan));
  }

  async getLoans(workerId?: number) {
    const rows = await this.loanRepository.find({
      where: workerId ? { worker: { id: workerId } } : {},
      relations: { worker: true, repayments: true },
      order: { date: 'DESC', id: 'DESC' },
    });
    return { data: rows.map((row) => this.serializeLoan(row)) };
  }

  async repayLoan(loanId: number, dto: CreateLoanRepaymentDto) {
    await this.dataSource.transaction(async (manager) => {
      const loan = await manager.findOne(Loan, {
        where: { id: loanId },
        relations: { worker: true },
      });
      if (!loan) {
        throw new NotFoundException(`Loan with id ${loanId} was not found.`);
      }
      const amount = this.money(dto.amount);
      if (amount > this.money(loan.remainingAmount)) {
        throw new BadRequestException(
          `Repayment exceeds the remaining loan amount of ${loan.remainingAmount}.`,
        );
      }
      await manager.save(
        manager.create(LoanRepayment, {
          loan,
          amount,
          date: this.dateKey(dto.date),
          method: dto.method,
          reference: this.optionalText(dto.reference),
          notes: this.optionalText(dto.notes),
        }),
      );
      this.applyLoanBalance(loan, amount);
      await manager.save(loan);
    });
    const loan = await this.loanRepository.findOne({
      where: { id: loanId },
      relations: { worker: true, repayments: true },
    });
    return this.serializeLoan(loan!);
  }

  async getDashboardStats(startDate?: string, endDate?: string) {
    const range = this.normalizeWeekRange(startDate, endDate);
    const payrollBase = this.payrollRepository
      .createQueryBuilder('payroll')
      .where('payroll.status != :cancelled', {
        cancelled: PayrollStatus.CANCELLED,
      })
      .andWhere('payroll.periodEnd >= :start', { start: range.start })
      .andWhere('payroll.periodStart <= :end', { end: range.end });

    const [
      activeWorkers,
      dueRaw,
      paidRaw,
      remainingRaw,
      activeAdvances,
      activeLoans,
    ] = await Promise.all([
      this.workerRepository.count({ where: { status: WorkerStatus.ACTIVE } }),
      payrollBase
        .clone()
        .select('COALESCE(SUM(payroll.amountDue), 0)', 'value')
        .getRawOne<{ value: string }>(),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'value')
        .where('payment.date BETWEEN :start AND :end', range)
        .getRawOne<{ value: string }>(),
      payrollBase
        .clone()
        .select('COALESCE(SUM(payroll.remainingAmount), 0)', 'value')
        .getRawOne<{ value: string }>(),
      this.advanceRepository.count({
        where: { status: Not(BalanceStatus.SETTLED) },
      }),
      this.loanRepository.count({ where: { status: Not(LoanStatus.REPAID) } }),
    ]);

    return {
      periodStart: range.start,
      periodEnd: range.end,
      activeWorkers,
      salariesDueThisWeek: this.money(Number(dueRaw?.value ?? 0)),
      paidThisWeek: this.money(Number(paidRaw?.value ?? 0)),
      remainingToPay: this.money(Number(remainingRaw?.value ?? 0)),
      activeAdvances,
      activeLoans,
    };
  }

  async getWorkerFinancialProfile(workerId: number) {
    const worker = await this.workerRepository.findOne({
      where: { id: workerId },
    });
    if (!worker) {
      throw new NotFoundException(`Worker with id ${workerId} was not found.`);
    }
    const month = new Date().toISOString().slice(0, 7);
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;

    const [payrolls, payments, advances, loans] = await Promise.all([
      this.payrollRepository.find({
        where: { worker: { id: workerId } },
        relations: { payments: true },
        order: { periodEnd: 'DESC', id: 'DESC' },
      }),
      this.paymentRepository.find({
        where: { worker: { id: workerId } },
        relations: { payroll: true },
        order: { date: 'DESC', id: 'DESC' },
      }),
      this.advanceRepository.find({
        where: { worker: { id: workerId } },
        order: { date: 'DESC', id: 'DESC' },
      }),
      this.loanRepository.find({
        where: { worker: { id: workerId } },
        relations: { repayments: true },
        order: { date: 'DESC', id: 'DESC' },
      }),
    ]);

    const validPayrolls = payrolls.filter(
      (item) => item.status !== PayrollStatus.CANCELLED,
    );
    const piecePayrolls = validPayrolls.filter(
      (item) => item.salaryTypeSnapshot === SalaryType.PIECE,
    );
    const totalPieces = piecePayrolls.reduce(
      (sum, item) => sum + item.piecesCompleted,
      0,
    );
    const piecesThisMonth = piecePayrolls
      .filter(
        (item) => item.periodEnd >= monthStart && item.periodStart <= monthEnd,
      )
      .reduce((sum, item) => sum + item.piecesCompleted, 0);
    const outstandingAdvances = advances.reduce(
      (sum, item) => sum + item.remainingAmount,
      0,
    );
    const outstandingLoans = loans.reduce(
      (sum, item) => sum + item.remainingAmount,
      0,
    );

    return {
      summary: {
        totalPaid: this.money(
          payments.reduce((sum, item) => sum + item.amount, 0),
        ),
        paidThisMonth: this.money(
          payments
            .filter((item) => item.date >= monthStart && item.date <= monthEnd)
            .reduce((sum, item) => sum + item.amount, 0),
        ),
        lastPayment: payments[0]
          ? { amount: payments[0].amount, date: payments[0].date }
          : null,
        outstandingAdvances: this.money(outstandingAdvances),
        outstandingLoans: this.money(outstandingLoans),
        totalToRecover: this.money(outstandingAdvances + outstandingLoans),
        paymentCount: payments.length,
        totalPieces,
        piecesThisMonth,
        averageWeeklyPieces: piecePayrolls.length
          ? Math.round(totalPieces / piecePayrolls.length)
          : 0,
      },
      payrolls: payrolls.map((item) => this.serializePayroll(item)),
      payments: payments.map((item) => this.serializePayment(item)),
      advances: advances.map((item) => this.serializeAdvance(item)),
      loans: loans.map((item) => this.serializeLoan(item)),
    };
  }

  private async calculatePayrollValues(
    manager: EntityManager,
    worker: Worker,
    dto: CreatePayrollDto,
    excludePayrollId?: number,
    snapshot?: { salaryType: SalaryType; monthlySalary: number },
  ): Promise<PayrollValues> {
    const periodStart = this.dateKey(dto.periodStart);
    const periodEnd = this.dateKey(dto.periodEnd);
    this.validateWeeklyPeriod(periodStart, periodEnd);
    const otherDeductions = this.money(dto.otherDeductions ?? 0);

    const salaryType = snapshot?.salaryType ?? worker.salaryType;
    if (salaryType === SalaryType.PIECE) {
      const piecesCompleted = Math.floor(dto.piecesCompleted ?? 0);
      const piecePrice = this.money(dto.piecePrice ?? 0);
      if (piecesCompleted <= 0 || piecePrice <= 0) {
        throw new BadRequestException(
          'Piece payroll requires piecesCompleted and piecePrice greater than zero.',
        );
      }
      return {
        periodStart,
        periodEnd,
        salaryMonth: null,
        salaryTypeSnapshot: SalaryType.PIECE,
        monthlySalarySnapshot: 0,
        installmentsInMonth: 0,
        installmentNumber: 0,
        piecesCompleted,
        piecePrice,
        grossAmount: this.money(piecesCompleted * piecePrice),
        otherDeductions,
      };
    }

    const monthlySalary = this.money(
      snapshot?.monthlySalary ?? worker.monthlySalary,
    );
    if (monthlySalary <= 0) {
      throw new BadRequestException(
        'Monthly workers must have a monthly salary greater than zero.',
      );
    }
    const salaryMonth = dto.salaryMonth ?? periodStart.slice(0, 7);
    const installmentsInMonth = dto.installmentsInMonth ?? 4;
    const qb = manager
      .getRepository(Payroll)
      .createQueryBuilder('payroll')
      .select('COALESCE(SUM(payroll.grossAmount), 0)', 'total')
      .addSelect('COUNT(payroll.id)', 'count')
      .where('payroll.workerId = :workerId', { workerId: worker.id })
      .andWhere('payroll.salaryMonth = :salaryMonth', { salaryMonth })
      .andWhere('payroll.status != :cancelled', {
        cancelled: PayrollStatus.CANCELLED,
      });
    if (excludePayrollId) {
      qb.andWhere('payroll.id != :excludePayrollId', { excludePayrollId });
    }
    const existing = await qb.getRawOne<{ total: string; count: string }>();
    const alreadyAllocated = this.money(Number(existing?.total ?? 0));
    const remainingMonthly = this.money(monthlySalary - alreadyAllocated);
    if (remainingMonthly <= 0) {
      throw new BadRequestException(
        `The monthly salary for ${salaryMonth} is already fully allocated.`,
      );
    }
    const installmentNumber =
      dto.installmentNumber ?? Number(existing?.count ?? 0) + 1;
    if (installmentNumber > installmentsInMonth) {
      throw new BadRequestException(
        'Installment number cannot exceed installments in the month.',
      );
    }
    const theoretical = this.money(monthlySalary / installmentsInMonth);
    const grossAmount =
      installmentNumber === installmentsInMonth
        ? remainingMonthly
        : Math.min(theoretical, remainingMonthly);

    return {
      periodStart,
      periodEnd,
      salaryMonth,
      salaryTypeSnapshot: SalaryType.MONTHLY,
      monthlySalarySnapshot: monthlySalary,
      installmentsInMonth,
      installmentNumber,
      piecesCompleted: 0,
      piecePrice: 0,
      grossAmount: this.money(grossAmount),
      otherDeductions,
    };
  }

  private async applyBalanceDeductions(
    manager: EntityManager,
    payroll: Payroll,
    worker: Worker,
    dto: Pick<CreatePayrollDto, 'advanceDeductions' | 'loanDeductions'>,
  ) {
    const advanceTotal = await this.applyAdvanceDeductions(
      manager,
      payroll,
      worker,
      dto.advanceDeductions ?? [],
    );
    const loanTotal = await this.applyLoanDeductions(
      manager,
      payroll,
      worker,
      dto.loanDeductions ?? [],
    );
    const totalDeductions = this.money(
      advanceTotal + loanTotal + payroll.otherDeductions,
    );
    if (totalDeductions > payroll.grossAmount) {
      throw new BadRequestException(
        'Total deductions cannot exceed the calculated salary.',
      );
    }
    payroll.advanceDeduction = advanceTotal;
    payroll.loanDeduction = loanTotal;
    payroll.amountDue = this.money(payroll.grossAmount - totalDeductions);
    payroll.remainingAmount = payroll.amountDue;
  }

  private async applyAdvanceDeductions(
    manager: EntityManager,
    payroll: Payroll,
    worker: Worker,
    deductions: BalanceDeductionDto[],
  ) {
    let total = 0;
    for (const deduction of deductions) {
      const advance = await manager.findOne(Advance, {
        where: { id: deduction.id },
        relations: { worker: true },
      });
      if (!advance || advance.worker.id !== worker.id) {
        throw new BadRequestException(
          `Advance ${deduction.id} does not belong to this worker.`,
        );
      }
      const amount = this.money(deduction.amount);
      if (amount > this.money(advance.remainingAmount)) {
        throw new BadRequestException(
          `Advance deduction exceeds the remaining amount for advance ${advance.id}.`,
        );
      }
      advance.deductedAmount = this.money(advance.deductedAmount + amount);
      advance.remainingAmount = this.money(
        advance.amount - advance.deductedAmount,
      );
      advance.status = this.balanceStatus(
        advance.deductedAmount,
        advance.remainingAmount,
      );
      await manager.save(advance);
      await manager.save(
        manager.create(PayrollAdvanceDeduction, {
          payroll,
          advance,
          amount,
        }),
      );
      total += amount;
    }
    return this.money(total);
  }

  private async applyLoanDeductions(
    manager: EntityManager,
    payroll: Payroll,
    worker: Worker,
    deductions: BalanceDeductionDto[],
  ) {
    let total = 0;
    for (const deduction of deductions) {
      const loan = await manager.findOne(Loan, {
        where: { id: deduction.id },
        relations: { worker: true },
      });
      if (!loan || loan.worker.id !== worker.id) {
        throw new BadRequestException(
          `Loan ${deduction.id} does not belong to this worker.`,
        );
      }
      const amount = this.money(deduction.amount);
      if (amount > this.money(loan.remainingAmount)) {
        throw new BadRequestException(
          `Loan deduction exceeds the remaining amount for loan ${loan.id}.`,
        );
      }
      this.applyLoanBalance(loan, amount);
      await manager.save(loan);
      await manager.save(
        manager.create(PayrollLoanDeduction, { payroll, loan, amount }),
      );
      await manager.save(
        manager.create(LoanRepayment, {
          loan,
          payroll,
          amount,
          date: payroll.periodEnd,
          method: PayrollPaymentMethod.OTHER,
          notes: 'Retenue sur salaire',
        }),
      );
      total += amount;
    }
    return this.money(total);
  }

  private async reverseBalanceDeductions(
    manager: EntityManager,
    payroll: Payroll,
  ) {
    for (const item of payroll.advanceDeductions ?? []) {
      const advance = item.advance;
      advance.deductedAmount = this.money(
        Math.max(0, advance.deductedAmount - item.amount),
      );
      advance.remainingAmount = this.money(
        advance.amount - advance.deductedAmount,
      );
      advance.status = this.balanceStatus(
        advance.deductedAmount,
        advance.remainingAmount,
      );
      await manager.save(advance);
    }
    for (const item of payroll.loanDeductions ?? []) {
      const loan = item.loan;
      loan.repaidAmount = this.money(
        Math.max(0, loan.repaidAmount - item.amount),
      );
      loan.remainingAmount = this.money(loan.initialAmount - loan.repaidAmount);
      loan.status = this.loanStatus(loan.repaidAmount, loan.remainingAmount);
      await manager.save(loan);
    }
    await manager.delete(LoanRepayment, { payroll: { id: payroll.id } });
    await manager.delete(PayrollAdvanceDeduction, {
      payroll: { id: payroll.id },
    });
    await manager.delete(PayrollLoanDeduction, { payroll: { id: payroll.id } });
    payroll.advanceDeductions = [];
    payroll.loanDeductions = [];
  }

  private async ensurePeriodAvailable(
    manager: EntityManager,
    workerId: number,
    periodStart: string,
    periodEnd: string,
    excludeId?: number,
  ) {
    const qb = manager
      .getRepository(Payroll)
      .createQueryBuilder('payroll')
      .where('payroll.workerId = :workerId', { workerId })
      .andWhere('payroll.periodStart = :periodStart', {
        periodStart: this.dateKey(periodStart),
      })
      .andWhere('payroll.periodEnd = :periodEnd', {
        periodEnd: this.dateKey(periodEnd),
      })
      .andWhere('payroll.status != :cancelled', {
        cancelled: PayrollStatus.CANCELLED,
      });
    if (excludeId) qb.andWhere('payroll.id != :excludeId', { excludeId });
    if (await qb.getOne()) {
      throw new ConflictException(
        'A payroll already exists for this worker and period.',
      );
    }
  }

  private async findWorkerOrFail(manager: EntityManager, id: number) {
    const worker = await manager.findOne(Worker, { where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker with id ${id} was not found.`);
    }
    return worker;
  }

  private assertWorkerCanReceivePayroll(worker: Worker) {
    if (worker.status === WorkerStatus.ARCHIVED) {
      throw new BadRequestException(
        'Archived workers cannot receive new financial operations.',
      );
    }
  }

  private validateWeeklyPeriod(start: string, end: string) {
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);
    const days =
      Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    if (!Number.isFinite(days) || days < 1 || days > 7) {
      throw new BadRequestException(
        'A payroll period must contain between one and seven days.',
      );
    }
  }

  private applyLoanBalance(loan: Loan, amount: number) {
    loan.repaidAmount = this.money(loan.repaidAmount + amount);
    loan.remainingAmount = this.money(loan.initialAmount - loan.repaidAmount);
    loan.status = this.loanStatus(loan.repaidAmount, loan.remainingAmount);
  }

  private balanceStatus(paid: number, remaining: number) {
    if (remaining <= 0) return BalanceStatus.SETTLED;
    return paid > 0 ? BalanceStatus.PARTIALLY_SETTLED : BalanceStatus.OPEN;
  }

  private loanStatus(paid: number, remaining: number) {
    if (remaining <= 0) return LoanStatus.REPAID;
    return paid > 0 ? LoanStatus.PARTIALLY_REPAID : LoanStatus.OPEN;
  }

  private normalizeWeekRange(startDate?: string, endDate?: string) {
    if (startDate && endDate) {
      return { start: this.dateKey(startDate), end: this.dateKey(endDate) };
    }
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: this.localDate(monday), end: this.localDate(sunday) };
  }

  private serializePayroll(payroll: Payroll) {
    const payments = [...(payroll.payments ?? [])].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    return {
      id: payroll.id,
      workerId: payroll.worker?.id,
      workerName: payroll.worker?.fullName ?? '',
      role: payroll.worker?.role ?? '',
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      salaryMonth: payroll.salaryMonth,
      salaryType: payroll.salaryTypeSnapshot,
      monthlySalary: payroll.monthlySalarySnapshot,
      installmentsInMonth: payroll.installmentsInMonth,
      installmentNumber: payroll.installmentNumber,
      piecesCompleted: payroll.piecesCompleted,
      piecePrice: payroll.piecePrice,
      grossAmount: payroll.grossAmount,
      advanceDeduction: payroll.advanceDeduction,
      loanDeduction: payroll.loanDeduction,
      otherDeductions: payroll.otherDeductions,
      totalDeductions: this.money(
        payroll.advanceDeduction +
          payroll.loanDeduction +
          payroll.otherDeductions,
      ),
      amountDue: payroll.amountDue,
      paidAmount: payroll.paidAmount,
      remainingAmount: payroll.remainingAmount,
      status: payroll.status,
      notes: payroll.notes ?? '',
      cancelledAt: payroll.cancelledAt ?? null,
      cancellationReason: payroll.cancellationReason ?? null,
      paymentDate: payments[0]?.date ?? null,
      payments: payments.map((payment) => this.serializePayment(payment)),
      advanceDeductions: (payroll.advanceDeductions ?? []).map((item) => ({
        id: item.id,
        advanceId: item.advance?.id,
        amount: item.amount,
      })),
      loanDeductions: (payroll.loanDeductions ?? []).map((item) => ({
        id: item.id,
        loanId: item.loan?.id,
        amount: item.amount,
      })),
      createdAt: payroll.createdAt,
      updatedAt: payroll.updatedAt,
    };
  }

  private serializePayment(payment: SalaryPayment) {
    return {
      id: payment.id,
      payrollId: payment.payroll?.id,
      workerId: payment.worker?.id,
      workerName: payment.worker?.fullName ?? '',
      amount: payment.amount,
      date: payment.date,
      method: payment.method,
      reference: payment.reference ?? '',
      notes: payment.notes ?? '',
      createdAt: payment.createdAt,
    };
  }

  private serializeAdvance(advance: Advance) {
    return {
      id: advance.id,
      workerId: advance.worker?.id,
      workerName: advance.worker?.fullName ?? '',
      amount: advance.amount,
      deductedAmount: advance.deductedAmount,
      remainingAmount: advance.remainingAmount,
      date: advance.date,
      type: advance.type,
      status: advance.status,
      notes: advance.notes ?? '',
    };
  }

  private serializeLoan(loan: Loan) {
    return {
      id: loan.id,
      workerId: loan.worker?.id,
      workerName: loan.worker?.fullName ?? '',
      initialAmount: loan.initialAmount,
      repaidAmount: loan.repaidAmount,
      remainingAmount: loan.remainingAmount,
      date: loan.date,
      status: loan.status,
      notes: loan.notes ?? '',
      repayments: (loan.repayments ?? [])
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((item) => ({
          id: item.id,
          amount: item.amount,
          date: item.date,
          method: item.method,
          reference: item.reference ?? '',
          notes: item.notes ?? '',
        })),
    };
  }

  private money(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private dateKey(value: string) {
    return value.slice(0, 10);
  }

  private localDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private optionalText(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private async migrateLegacyFinanceData() {
    const tables = (await this.dataSource.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('payrolls_legacy', 'advances_legacy')",
    )) as { name: string }[];
    const names = new Set(tables.map((row) => row.name));

    if (names.has('payrolls_legacy')) {
      const rows = (await this.dataSource.query(
        'SELECT * FROM payrolls_legacy ORDER BY id',
      )) as Record<string, unknown>[];
      for (const row of rows) {
        const workerId = Number(row.workerId ?? 0);
        const worker = await this.workerRepository.findOne({
          where: { id: workerId },
        });
        if (!worker) continue;
        const periodStart = String(row.periodStart ?? '').slice(0, 10);
        const periodEnd = String(row.periodEnd ?? '').slice(0, 10);
        const duplicate = await this.payrollRepository.findOne({
          where: { worker: { id: workerId }, periodStart, periodEnd },
        });
        if (duplicate) continue;
        const isPiece = String(row.salaryType ?? '') === SalaryType.PIECE;
        const gross = this.money(
          Number(isPiece ? row.productionAmount : row.baseSalary) ||
            Number(row.netSalary) ||
            0,
        );
        const paid = Math.min(gross, this.money(Number(row.paidAmount ?? 0)));
        const payroll = await this.payrollRepository.save(
          this.payrollRepository.create({
            worker,
            periodStart,
            periodEnd,
            salaryMonth: isPiece ? null : periodStart.slice(0, 7),
            salaryTypeSnapshot: isPiece ? SalaryType.PIECE : SalaryType.MONTHLY,
            monthlySalarySnapshot: isPiece ? 0 : Number(row.baseSalary ?? 0),
            installmentsInMonth: isPiece ? 0 : 4,
            installmentNumber: isPiece ? 0 : 1,
            piecesCompleted: Number(row.piecesCompleted ?? 0),
            piecePrice: Number(row.piecePrice ?? 0),
            grossAmount: gross,
            advanceDeduction: Number(row.advances ?? 0),
            loanDeduction: 0,
            otherDeductions: Number(row.deductions ?? 0),
            amountDue: this.money(Number(row.netSalary ?? gross)),
            paidAmount: paid,
            remainingAmount: this.money(Number(row.netSalary ?? gross) - paid),
            status:
              paid <= 0
                ? PayrollStatus.CALCULATED
                : paid >= Number(row.netSalary ?? gross)
                  ? PayrollStatus.PAID
                  : PayrollStatus.PARTIALLY_PAID,
            notes: this.optionalText(String(row.notes ?? '')),
          }),
        );
        if (paid > 0) {
          await this.paymentRepository.save(
            this.paymentRepository.create({
              payroll,
              worker,
              amount: paid,
              date: String(row.paymentDate ?? periodEnd).slice(0, 10),
              method: PayrollPaymentMethod.CASH,
              notes: 'Paiement migré depuis l’ancien système',
            }),
          );
        }
      }
      await this.dataSource.query('DROP TABLE payrolls_legacy');
    }

    if (names.has('advances_legacy')) {
      const rows = (await this.dataSource.query(
        'SELECT * FROM advances_legacy ORDER BY id',
      )) as Record<string, unknown>[];
      for (const row of rows) {
        const worker = await this.workerRepository.findOne({
          where: { id: Number(row.workerId ?? 0) },
        });
        if (!worker) continue;
        const amount = this.money(Number(row.amount ?? 0));
        const settled = Boolean(row.isDeducted);
        await this.advanceRepository.save(
          this.advanceRepository.create({
            worker,
            amount,
            deductedAmount: settled ? amount : 0,
            remainingAmount: settled ? 0 : amount,
            date: String(row.date ?? '').slice(0, 10),
            type: AdvanceType.SALARY,
            status: settled ? BalanceStatus.SETTLED : BalanceStatus.OPEN,
            notes: this.optionalText(String(row.notes ?? '')),
          }),
        );
      }
      await this.dataSource.query('DROP TABLE advances_legacy');
    }
  }
}
