import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import {
  AttendanceStatus,
  ProductionTaskType,
  SalaryType,
  WorkerStatus,
} from '../common/enums';
import { PayrollService } from '../payroll/payroll.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateProductionDto } from './dto/create-production.dto';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { normalizeEnumValue } from './dto/normalize-enum-value';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkerFilterDto } from './dto/worker-filter.dto';
import { Attendance } from './entities/attendance.entity';
import { WorkerProduction } from './entities/worker-production.entity';
import { Worker } from './entities/worker.entity';

type PaginationInput = {
  page?: number | string;
  limit?: number | string;
};

type PeriodFilters = PaginationInput & {
  startDate?: string;
  endDate?: string;
};

type AttendanceFilters = PeriodFilters & {
  status?: string;
};

type WorkerMetrics = {
  totalPieces: number;
  attendanceToday: AttendanceStatus | null;
  productivityPercent: number;
};

type PaginationPayload = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const PRODUCTIVITY_TARGET = 180;

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(WorkerProduction)
    private readonly productionRepository: Repository<WorkerProduction>,
    private readonly payrollService: PayrollService,
  ) {}

  async create(dto: CreateWorkerDto) {
    this.validateMonthlySalary(dto.salaryType, dto.monthlySalary ?? 0);
    const worker = this.workersRepository.create({
      fullName: dto.fullName.trim(),
      phone: this.normalizeOptionalText(dto.phone),
      role: dto.role,
      salaryType: dto.salaryType,
      monthlySalary:
        dto.salaryType === SalaryType.MONTHLY ? (dto.monthlySalary ?? 0) : 0,
      startDate: this.normalizeDate(dto.startDate),
      status: dto.status ?? WorkerStatus.ACTIVE,
      notes: this.normalizeOptionalText(dto.notes),
    });

    const saved = await this.workersRepository.save(worker);
    return this.buildWorkerResponse(saved);
  }

  async findAll(query: WorkerFilterDto = {}) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const sortBy = this.normalizeSortBy(query.sortBy);
    const sortOrder = query.sortOrder ?? 'ASC';

    const qb = this.workersRepository.createQueryBuilder('worker');

    if (!query.includeArchived && !query.status) {
      qb.andWhere('worker.status != :archived', {
        archived: WorkerStatus.ARCHIVED,
      });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(worker.fullName LIKE :search OR worker.phone LIKE :search)',
        { search },
      );
    }

    if (query.role) {
      qb.andWhere('worker.role = :role', { role: query.role });
    }

    if (query.salaryType) {
      qb.andWhere('worker.salaryType = :salaryType', {
        salaryType: query.salaryType,
      });
    }

    if (query.status) {
      qb.andWhere('worker.status = :status', { status: query.status });
    }

    qb.orderBy(`worker.${sortBy}`, sortOrder).skip((page - 1) * limit).take(limit);

    const [workers, total] = await qb.getManyAndCount();
    const metrics = await this.getWorkerMetrics(workers.map((worker) => worker.id));

    return this.buildListResponse(
      workers.map((worker) => this.serializeWorker(worker, metrics.get(worker.id))),
      this.buildPagination(page, limit, total),
    );
  }

  async findOne(id: number) {
    const worker = await this.findWorkerOrFail(id);
    return this.buildWorkerResponse(worker);
  }

  async update(id: number, dto: UpdateWorkerDto) {
    const worker = await this.findWorkerOrFail(id);

    if (dto.fullName !== undefined) {
      worker.fullName = dto.fullName.trim();
    }

    if (dto.phone !== undefined) {
      worker.phone = this.normalizeOptionalText(dto.phone);
    }

    if (dto.role !== undefined) {
      worker.role = dto.role;
    }

    if (dto.salaryType !== undefined) {
      worker.salaryType = dto.salaryType;
    }

    if (dto.monthlySalary !== undefined) {
      worker.monthlySalary = dto.monthlySalary;
    }

    if (worker.salaryType === SalaryType.PIECE) worker.monthlySalary = 0;
    this.validateMonthlySalary(worker.salaryType, worker.monthlySalary);

    if (dto.startDate !== undefined) {
      worker.startDate = this.normalizeDate(dto.startDate);
    }

    if (dto.status !== undefined) {
      worker.status = dto.status;
      worker.archivedAt =
        dto.status === WorkerStatus.ARCHIVED ? new Date() : null;
    }

    if (dto.notes !== undefined) {
      worker.notes = this.normalizeOptionalText(dto.notes);
    }

    const saved = await this.workersRepository.save(worker);
    return this.buildWorkerResponse(saved);
  }

  async remove(id: number) {
    const worker = await this.findWorkerOrFail(id);
    worker.status = WorkerStatus.ARCHIVED;
    worker.archivedAt = new Date();
    await this.workersRepository.save(worker);

    return {
      archived: true,
      id,
    };
  }

  async getStats() {
    const today = this.toDateKey(new Date());
    const { start, end } = this.currentMonthRange();

    const [totalWorkers, activeWorkers, presentToday, absentToday, piecesRaw] =
      await Promise.all([
        this.workersRepository.count({
          where: { status: Not(WorkerStatus.ARCHIVED) },
        }),
        this.workersRepository.count({
          where: { status: WorkerStatus.ACTIVE },
        }),
        this.attendanceRepository.count({
          where: {
            date: today,
            status: In([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
          },
        }),
        this.attendanceRepository.count({
          where: {
            date: today,
            status: AttendanceStatus.ABSENT,
          },
        }),
        this.productionRepository
          .createQueryBuilder('production')
          .select('COALESCE(SUM(production.piecesCompleted), 0)', 'pieces')
          .where('production.date BETWEEN :start AND :end', { start, end })
          .getRawOne<{ pieces: number | string }>(),
      ]);

    const piecesThisMonth = Number(piecesRaw?.pieces ?? 0);

    return {
      totalWorkers,
      activeWorkers,
      presentToday,
      absentToday,
      piecesThisMonth,
      totalPiecesThisMonth: piecesThisMonth,
    };
  }

  async getProfile(id: number) {
    const worker = await this.findWorkerOrFail(id);
    const [attendanceSummary, productionSummary, financial] = await Promise.all([
      this.getAttendanceSummary(id),
      this.getProductionSummary(id),
      this.payrollService.getWorkerFinancialProfile(id),
    ]);

    return {
      worker: {
        id: worker.id,
        fullName: worker.fullName,
        phone: worker.phone,
        role: worker.role,
        salaryType: worker.salaryType,
        monthlySalary: worker.monthlySalary,
        startDate: worker.startDate,
        status: worker.status,
        notes: worker.notes,
      },
      attendanceSummary,
      productionSummary,
      financialSummary: financial.summary,
      payrolls: financial.payrolls,
      salaryPayments: financial.payments,
      advances: financial.advances,
      loans: financial.loans,
    };
  }

  async createAttendance(workerId: number, dto: CreateAttendanceDto) {
    const worker = await this.findWorkerOrFail(workerId);
    const date = this.normalizeDate(dto.date);

    await this.ensureAttendanceDateIsAvailable(workerId, date);

    const attendance = this.attendanceRepository.create({
      worker,
      date,
      status: dto.status,
      checkIn: this.normalizeOptionalText(dto.checkIn ?? dto.checkInTime),
      checkOut: this.normalizeOptionalText(dto.checkOut ?? dto.checkOutTime),
      lateMinutes: dto.lateMinutes ?? 0,
      notes: this.normalizeOptionalText(dto.notes),
    });

    const saved = await this.attendanceRepository.save(attendance);
    return this.serializeAttendance(saved, worker.id);
  }

  async getAttendance(workerId: number, filters: AttendanceFilters = {}) {
    await this.findWorkerOrFail(workerId);

    const page = this.normalizePage(filters.page);
    const limit = this.normalizeLimit(filters.limit);
    const normalizedStatus = filters.status
      ? (normalizeEnumValue(filters.status, AttendanceStatus) as AttendanceStatus)
      : undefined;

    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.workerId = :workerId', { workerId });

    if (normalizedStatus && Object.values(AttendanceStatus).includes(normalizedStatus)) {
      qb.andWhere('attendance.status = :status', { status: normalizedStatus });
    }

    this.applyDateFilters(qb, 'attendance.date', filters);

    qb.orderBy('attendance.date', 'DESC')
      .addOrderBy('attendance.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return this.buildListResponse(
      rows.map((row) => this.serializeAttendance(row, workerId)),
      this.buildPagination(page, limit, total),
    );
  }

  async updateAttendance(id: number, dto: UpdateAttendanceDto) {
    const attendance = await this.findAttendanceOrFail(id);
    const workerId = await this.getAttendanceWorkerId(id);

    if (dto.date !== undefined) {
      const nextDate = this.normalizeDate(dto.date);
      if (nextDate !== attendance.date) {
        await this.ensureAttendanceDateIsAvailable(workerId, nextDate, id);
      }
      attendance.date = nextDate;
    }

    if (dto.status !== undefined) {
      attendance.status = dto.status;
    }

    if (dto.checkIn !== undefined || dto.checkInTime !== undefined) {
      attendance.checkIn = this.normalizeOptionalText(
        dto.checkIn ?? dto.checkInTime,
      );
    }

    if (dto.checkOut !== undefined || dto.checkOutTime !== undefined) {
      attendance.checkOut = this.normalizeOptionalText(
        dto.checkOut ?? dto.checkOutTime,
      );
    }

    if (dto.lateMinutes !== undefined) {
      attendance.lateMinutes = dto.lateMinutes;
    }

    if (dto.notes !== undefined) {
      attendance.notes = this.normalizeOptionalText(dto.notes);
    }

    const saved = await this.attendanceRepository.save(attendance);
    return this.serializeAttendance(saved, workerId);
  }

  async createProduction(workerId: number, dto: CreateProductionDto) {
    const worker = await this.findWorkerOrFail(workerId);
    const piecePrice = dto.piecePrice ?? 0;

    const production = this.productionRepository.create({
      worker,
      date: this.normalizeDate(dto.date),
      taskType: dto.taskType,
      piecesCompleted: dto.piecesCompleted,
      piecePrice,
      totalAmount: this.calculateTotalAmount(dto.piecesCompleted, piecePrice),
      notes: this.normalizeOptionalText(dto.notes),
    });

    const saved = await this.productionRepository.save(production);
    return this.serializeProduction(saved, worker.id);
  }

  async getProduction(workerId: number, filters: PeriodFilters = {}) {
    await this.findWorkerOrFail(workerId);

    const page = this.normalizePage(filters.page);
    const limit = this.normalizeLimit(filters.limit);

    const qb = this.productionRepository
      .createQueryBuilder('production')
      .where('production.workerId = :workerId', { workerId });

    this.applyDateFilters(qb, 'production.date', filters);

    qb.orderBy('production.date', 'DESC')
      .addOrderBy('production.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return this.buildListResponse(
      rows.map((row) => this.serializeProduction(row, workerId)),
      this.buildPagination(page, limit, total),
    );
  }

  async updateProduction(id: number, dto: UpdateProductionDto) {
    const production = await this.findProductionOrFail(id);
    const workerId = await this.getProductionWorkerId(id);

    if (dto.date !== undefined) {
      production.date = this.normalizeDate(dto.date);
    }

    if (dto.taskType !== undefined) {
      production.taskType = dto.taskType;
    }

    if (dto.piecesCompleted !== undefined) {
      production.piecesCompleted = dto.piecesCompleted;
    }

    if (dto.piecePrice !== undefined) {
      production.piecePrice = dto.piecePrice;
    }

    if (dto.notes !== undefined) {
      production.notes = this.normalizeOptionalText(dto.notes);
    }

    production.totalAmount = this.calculateTotalAmount(
      production.piecesCompleted,
      production.piecePrice,
    );

    const saved = await this.productionRepository.save(production);
    return this.serializeProduction(saved, workerId);
  }

  private async buildWorkerResponse(worker: Worker) {
    const metrics = await this.getWorkerMetrics([worker.id]);
    return this.serializeWorker(worker, metrics.get(worker.id));
  }

  private serializeWorker(worker: Worker, metrics?: WorkerMetrics) {
    const totalPieces = metrics?.totalPieces ?? 0;
    const attendanceToday = metrics?.attendanceToday ?? null;
    const productivityPercent = metrics?.productivityPercent ?? 0;

    return {
      id: worker.id,
      fullName: worker.fullName,
      phone: worker.phone,
      role: worker.role,
      salaryType: worker.salaryType,
      monthlySalary: worker.monthlySalary,
      startDate: worker.startDate,
      status: worker.status,
      notes: worker.notes,
      totalPieces,
      totalPiecesCompleted: totalPieces,
      attendanceToday,
      attendanceStatusToday: attendanceToday,
      productivityPercent,
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
    };
  }

  private serializeAttendance(attendance: Attendance, workerId: number) {
    return {
      id: attendance.id,
      workerId,
      date: attendance.date,
      status: attendance.status,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      checkInTime: attendance.checkIn,
      checkOutTime: attendance.checkOut,
      lateMinutes: attendance.lateMinutes,
      notes: attendance.notes,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt,
    };
  }

  private serializeProduction(production: WorkerProduction, workerId: number) {
    return {
      id: production.id,
      workerId,
      date: production.date,
      taskType: production.taskType,
      piecesCompleted: production.piecesCompleted,
      piecePrice: production.piecePrice,
      totalAmount: production.totalAmount,
      notes: production.notes,
      createdAt: production.createdAt,
      updatedAt: production.updatedAt,
    };
  }

  private buildListResponse<T>(data: T[], pagination: PaginationPayload) {
    return {
      data,
      pagination,
      meta: pagination,
    };
  }

  private buildPagination(
    page: number,
    limit: number,
    total: number,
  ): PaginationPayload {
    return {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private async getWorkerMetrics(workerIds: number[]) {
    const metrics = new Map<number, WorkerMetrics>();

    for (const workerId of workerIds) {
      metrics.set(workerId, {
        totalPieces: 0,
        attendanceToday: null,
        productivityPercent: 0,
      });
    }

    if (!workerIds.length) {
      return metrics;
    }

    const today = this.toDateKey(new Date());

    const [productionRows, attendanceRows] = await Promise.all([
      this.productionRepository
        .createQueryBuilder('production')
        .select('production.workerId', 'workerId')
        .addSelect('COALESCE(SUM(production.piecesCompleted), 0)', 'totalPieces')
        .where('production.workerId IN (:...workerIds)', { workerIds })
        .groupBy('production.workerId')
        .getRawMany<{ workerId: string; totalPieces: string }>(),
      this.attendanceRepository
        .createQueryBuilder('attendance')
        .select('attendance.workerId', 'workerId')
        .addSelect('attendance.status', 'status')
        .where('attendance.workerId IN (:...workerIds)', { workerIds })
        .andWhere('attendance.date = :today', { today })
        .getRawMany<{ workerId: string; status: AttendanceStatus }>(),
    ]);

    for (const row of productionRows) {
      const workerId = Number(row.workerId);
      const totalPieces = Number(row.totalPieces ?? 0);
      metrics.set(workerId, {
        totalPieces,
        attendanceToday: metrics.get(workerId)?.attendanceToday ?? null,
        productivityPercent: this.calculateProductivity(totalPieces),
      });
    }

    for (const row of attendanceRows) {
      const workerId = Number(row.workerId);
      const current = metrics.get(workerId);
      if (current) {
        current.attendanceToday = row.status;
      }
    }

    return metrics;
  }

  private async getAttendanceSummary(workerId: number) {
    const rows = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('attendance.status', 'status')
      .addSelect('COUNT(attendance.id)', 'count')
      .where('attendance.workerId = :workerId', { workerId })
      .groupBy('attendance.status')
      .getRawMany<{ status: AttendanceStatus; count: string }>();

    const counts = new Map(
      rows.map((row) => [row.status, Number(row.count ?? 0)]),
    );

    return {
      presentDays: counts.get(AttendanceStatus.PRESENT) ?? 0,
      absentDays: counts.get(AttendanceStatus.ABSENT) ?? 0,
      lateDays: counts.get(AttendanceStatus.LATE) ?? 0,
    };
  }

  private async getProductionSummary(workerId: number) {
    const summary = await this.productionRepository
      .createQueryBuilder('production')
      .select('COALESCE(SUM(production.piecesCompleted), 0)', 'totalPieces')
      .addSelect('COALESCE(SUM(production.totalAmount), 0)', 'totalAmount')
      .where('production.workerId = :workerId', { workerId })
      .getRawOne<{ totalPieces: string; totalAmount: string }>();

    return {
      totalPieces: Number(summary?.totalPieces ?? 0),
      totalAmount: Number(summary?.totalAmount ?? 0),
    };
  }

  private async findWorkerOrFail(id: number) {
    const worker = await this.workersRepository.findOne({ where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker with id ${id} was not found.`);
    }
    return worker;
  }

  private async findAttendanceOrFail(id: number) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
    });
    if (!attendance) {
      throw new NotFoundException(`Attendance with id ${id} was not found.`);
    }
    return attendance;
  }

  private async findProductionOrFail(id: number) {
    const production = await this.productionRepository.findOne({
      where: { id },
    });
    if (!production) {
      throw new NotFoundException(`Production with id ${id} was not found.`);
    }
    return production;
  }

  private async ensureAttendanceDateIsAvailable(
    workerId: number,
    date: string,
    excludeAttendanceId?: number,
  ) {
    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.workerId = :workerId', { workerId })
      .andWhere('attendance.date = :date', { date });

    if (excludeAttendanceId) {
      qb.andWhere('attendance.id != :excludeAttendanceId', { excludeAttendanceId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new BadRequestException(
        'Attendance already exists for this worker and date.',
      );
    }
  }

  private async getAttendanceWorkerId(attendanceId: number) {
    const raw = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('attendance.workerId', 'workerId')
      .where('attendance.id = :attendanceId', { attendanceId })
      .getRawOne<{ workerId: string }>();

    return Number(raw?.workerId ?? 0);
  }

  private async getProductionWorkerId(productionId: number) {
    const raw = await this.productionRepository
      .createQueryBuilder('production')
      .select('production.workerId', 'workerId')
      .where('production.id = :productionId', { productionId })
      .getRawOne<{ workerId: string }>();

    return Number(raw?.workerId ?? 0);
  }

  private calculateTotalAmount(piecesCompleted: number, piecePrice: number) {
    if (piecesCompleted < 0 || piecePrice < 0) {
      throw new BadRequestException(
        'Production pieces and piece price must be positive.',
      );
    }

    return piecesCompleted * piecePrice;
  }

  private calculateProductivity(totalPieces: number) {
    return Math.min(
      100,
      Math.round((totalPieces / PRODUCTIVITY_TARGET) * 100),
    );
  }

  private normalizePage(value?: number | string) {
    const page = Number(value ?? DEFAULT_PAGE);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  }

  private normalizeLimit(value?: number | string) {
    const limit = Number(value ?? DEFAULT_LIMIT);
    if (!Number.isFinite(limit) || limit <= 0) {
      return DEFAULT_LIMIT;
    }
    return Math.min(Math.floor(limit), MAX_LIMIT);
  }

  private normalizeSortBy(sortBy?: string) {
    const allowed = new Set([
      'id',
      'fullName',
      'phone',
      'role',
      'salaryType',
      'monthlySalary',
      'startDate',
      'status',
      'createdAt',
      'updatedAt',
    ]);

    return allowed.has(sortBy ?? '') ? sortBy! : 'fullName';
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeDate(value: string) {
    return value.slice(0, 10);
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private currentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: this.toDateKey(start),
      end: this.toDateKey(end),
    };
  }

  private applyDateFilters(
    qb: {
      andWhere: (
        query: string,
        params: Record<string, string>,
      ) => unknown;
    },
    column: string,
    filters: PeriodFilters,
  ) {
    if (filters.startDate) {
      qb.andWhere(`${column} >= :startDate`, {
        startDate: this.normalizeDate(filters.startDate),
      });
    }

    if (filters.endDate) {
      qb.andWhere(`${column} <= :endDate`, {
        endDate: this.normalizeDate(filters.endDate),
      });
    }
  }

  private validateMonthlySalary(salaryType: SalaryType, amount: number) {
    if (salaryType === SalaryType.MONTHLY && amount <= 0) {
      throw new BadRequestException(
        'A monthly worker must have a monthly salary greater than zero.',
      );
    }
  }
}
