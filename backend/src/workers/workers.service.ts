import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AttendanceStatus,
  WorkerRole,
  WorkerStatus,
} from '../common/enums';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateWorkerProductionDto } from './dto/create-worker-production.dto';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdateWorkerProductionDto } from './dto/update-worker-production.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkerQueryDto } from './dto/worker-query.dto';
import { Attendance } from './entities/attendance.entity';
import { WorkerProduction } from './entities/worker-production.entity';
import { Worker } from './entities/worker.entity';

type PeriodFilters = {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

type AttendanceFilters = PeriodFilters & {
  status?: AttendanceStatus;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const PRODUCTIVITY_TARGET_PIECES = 180;

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(WorkerProduction)
    private readonly productionRepository: Repository<WorkerProduction>,
  ) {}

  async create(createWorkerDto: CreateWorkerDto) {
    const worker = this.workersRepository.create({
      ...createWorkerDto,
      salaryValue: createWorkerDto.salaryValue ?? 0,
      status: createWorkerDto.status ?? WorkerStatus.ACTIVE,
    });

    const saved = await this.workersRepository.save(worker);
    return this.toWorkerResponse(saved, {
      totalPiecesCompleted: 0,
      attendanceStatusToday: null,
      productivityPercent: 0,
    });
  }

  async findAll(query: WorkerQueryDto = {}) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const sortBy = this.normalizeSortBy(query.sortBy);
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.workersRepository.createQueryBuilder('worker');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere('(worker.fullName LIKE :search OR worker.phone LIKE :search)', {
        search,
      });
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

    qb.orderBy(`worker.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [workers, total] = await qb.getManyAndCount();
    const computed = await this.getComputedListValues(workers);

    return {
      data: workers.map((worker) =>
        this.toWorkerResponse(worker, computed.get(worker.id)),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: number) {
    return this.findWorkerOrFail(id);
  }

  async update(id: number, updateWorkerDto: UpdateWorkerDto) {
    const worker = await this.findWorkerOrFail(id);
    this.workersRepository.merge(worker, updateWorkerDto);
    const saved = await this.workersRepository.save(worker);
    const computed = await this.getComputedListValues([saved]);
    return this.toWorkerResponse(saved, computed.get(saved.id));
  }

  async remove(id: number) {
    const worker = await this.findWorkerOrFail(id);
    await this.workersRepository.remove(worker);
    return {
      deleted: true,
      id,
    };
  }

  async findActiveWorkers() {
    const workers = await this.workersRepository.find({
      where: { status: WorkerStatus.ACTIVE },
      order: { fullName: 'ASC' },
    });
    const computed = await this.getComputedListValues(workers);
    return workers.map((worker) => this.toWorkerResponse(worker, computed.get(worker.id)));
  }

  async findByRole(role: WorkerRole) {
    const workers = await this.workersRepository.find({
      where: { role },
      order: { fullName: 'ASC' },
    });
    const computed = await this.getComputedListValues(workers);
    return workers.map((worker) => this.toWorkerResponse(worker, computed.get(worker.id)));
  }

  async getWorkerProfile(id: number) {
    const worker = await this.findWorkerOrFail(id);
    const [attendanceSummary, productionSummary] = await Promise.all([
      this.getAttendanceSummary(id),
      this.getProductionSummary(id),
    ]);

    return {
      id: worker.id,
      fullName: worker.fullName,
      phone: worker.phone,
      role: worker.role,
      salaryType: worker.salaryType,
      salaryValue: worker.salaryValue,
      startDate: worker.startDate,
      status: worker.status,
      notes: worker.notes,
      attendanceSummary,
      productionSummary,
      latestNotes: worker.notes,
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
    };
  }

  async getWorkersStats() {
    const today = this.toDateKey(new Date());
    const { start, end } = this.currentMonthRange();

    const [
      totalWorkers,
      activeWorkers,
      presentToday,
      absentToday,
      productionRaw,
    ] = await Promise.all([
      this.workersRepository.count(),
      this.workersRepository.count({ where: { status: WorkerStatus.ACTIVE } }),
      this.attendanceRepository.count({
        where: { date: today, status: AttendanceStatus.PRESENT },
      }),
      this.attendanceRepository.count({
        where: { date: today, status: AttendanceStatus.ABSENT },
      }),
      this.productionRepository
        .createQueryBuilder('production')
        .select('COALESCE(SUM(production.piecesCompleted), 0)', 'total')
        .where('production.date BETWEEN :start AND :end', { start, end })
        .getRawOne<{ total: number | string }>(),
    ]);

    return {
      totalWorkers,
      activeWorkers,
      presentToday,
      absentToday,
      totalPiecesThisMonth: Number(productionRaw?.total ?? 0),
    };
  }

  async getTodayAttendance() {
    const today = this.toDateKey(new Date());
    const [workers, attendances] = await Promise.all([
      this.workersRepository.find({
        where: { status: WorkerStatus.ACTIVE },
        order: { fullName: 'ASC' },
      }),
      this.attendanceRepository.find({
        where: { date: today },
        relations: { worker: true },
      }),
    ]);

    const attendanceByWorker = new Map(
      attendances.map((attendance) => [attendance.worker.id, attendance]),
    );

    return workers.map((worker) => {
      const attendance = attendanceByWorker.get(worker.id);
      return {
        workerId: worker.id,
        fullName: worker.fullName,
        role: worker.role,
        date: today,
        status: attendance?.status ?? null,
        checkInTime: attendance?.checkInTime ?? null,
        checkOutTime: attendance?.checkOutTime ?? null,
        lateMinutes: attendance?.lateMinutes ?? 0,
        notes: attendance?.notes ?? null,
      };
    });
  }

  async markAttendance(workerId: number, createAttendanceDto: CreateAttendanceDto) {
    const worker = await this.findWorkerOrFail(workerId);
    const existing = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.workerId = :workerId', { workerId })
      .andWhere('attendance.date = :date', { date: createAttendanceDto.date })
      .getOne();

    if (existing) {
      throw new BadRequestException(
        'Attendance already exists for this worker and date.',
      );
    }

    const attendance = this.attendanceRepository.create({
      ...createAttendanceDto,
      lateMinutes: createAttendanceDto.lateMinutes ?? 0,
      worker,
    });

    return this.attendanceRepository.save(attendance);
  }

  async updateAttendance(
    attendanceId: number,
    updateAttendanceDto: UpdateAttendanceDto,
  ) {
    const attendance = await this.findAttendanceOrFail(attendanceId);
    this.attendanceRepository.merge(attendance, updateAttendanceDto);
    return this.attendanceRepository.save(attendance);
  }

  async getWorkerAttendance(workerId: number, filters: AttendanceFilters = {}) {
    await this.findWorkerOrFail(workerId);
    const page = this.normalizePage(filters.page);
    const limit = this.normalizeLimit(filters.limit);

    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.workerId = :workerId', { workerId });

    if (filters.status) {
      qb.andWhere('attendance.status = :status', { status: filters.status });
    }

    this.applyDateFilters(qb, 'attendance.date', filters);

    qb.orderBy('attendance.date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async addProduction(
    workerId: number,
    createWorkerProductionDto: CreateWorkerProductionDto,
  ) {
    const worker = await this.findWorkerOrFail(workerId);
    const piecePrice = createWorkerProductionDto.piecePrice ?? worker.salaryValue ?? 0;

    const production = this.productionRepository.create({
      ...createWorkerProductionDto,
      piecePrice,
      totalAmount: this.calculateProductionAmount(
        createWorkerProductionDto.piecesCompleted,
        piecePrice,
      ),
      worker,
    });

    return this.productionRepository.save(production);
  }

  async updateProduction(
    productionId: number,
    updateWorkerProductionDto: UpdateWorkerProductionDto,
  ) {
    const production = await this.findProductionOrFail(productionId);

    this.productionRepository.merge(production, updateWorkerProductionDto);
    production.piecePrice = updateWorkerProductionDto.piecePrice ?? production.piecePrice ?? 0;
    production.piecesCompleted =
      updateWorkerProductionDto.piecesCompleted ?? production.piecesCompleted ?? 0;
    production.totalAmount = this.calculateProductionAmount(
      production.piecesCompleted,
      production.piecePrice,
    );

    return this.productionRepository.save(production);
  }

  async getWorkerProduction(workerId: number, filters: PeriodFilters = {}) {
    await this.findWorkerOrFail(workerId);
    const page = this.normalizePage(filters.page);
    const limit = this.normalizeLimit(filters.limit);

    const qb = this.productionRepository
      .createQueryBuilder('production')
      .where('production.workerId = :workerId', { workerId });

    this.applyDateFilters(qb, 'production.date', filters);

    qb.orderBy('production.date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getProductivityRanking(periodStart?: string, periodEnd?: string) {
    const qb = this.productionRepository
      .createQueryBuilder('production')
      .innerJoin('production.worker', 'worker')
      .select('worker.id', 'id')
      .addSelect('worker.fullName', 'fullName')
      .addSelect('worker.role', 'role')
      .addSelect('COALESCE(SUM(production.piecesCompleted), 0)', 'totalPieces')
      .addSelect('COALESCE(SUM(production.totalAmount), 0)', 'totalAmount')
      .groupBy('worker.id')
      .addGroupBy('worker.fullName')
      .addGroupBy('worker.role')
      .orderBy('totalPieces', 'DESC');

    if (periodStart) {
      qb.andWhere('production.date >= :periodStart', { periodStart });
    }

    if (periodEnd) {
      qb.andWhere('production.date <= :periodEnd', { periodEnd });
    }

    const rows = await qb.getRawMany<{
      id: number;
      fullName: string;
      role: WorkerRole;
      totalPieces: number | string;
      totalAmount: number | string;
    }>();

    return rows.map((row, index) => {
      const totalPieces = Number(row.totalPieces ?? 0);
      return {
        rank: index + 1,
        id: Number(row.id),
        fullName: row.fullName,
        role: row.role,
        totalPieces,
        totalAmount: Number(row.totalAmount ?? 0),
        productivityPercent: this.calculateProductivityPercent(totalPieces),
      };
    });
  }

  private async findWorkerOrFail(id: number) {
    const worker = await this.workersRepository.findOne({ where: { id } });
    if (!worker) {
      throw new NotFoundException(`Worker with id ${id} was not found.`);
    }
    return worker;
  }

  private async findAttendanceOrFail(id: number) {
    const attendance = await this.attendanceRepository.findOne({ where: { id } });
    if (!attendance) {
      throw new NotFoundException(`Attendance with id ${id} was not found.`);
    }
    return attendance;
  }

  private async findProductionOrFail(id: number) {
    const production = await this.productionRepository.findOne({ where: { id } });
    if (!production) {
      throw new NotFoundException(`Production with id ${id} was not found.`);
    }
    return production;
  }

  private async getComputedListValues(workers: Worker[]) {
    const ids = workers.map((worker) => worker.id);
    const result = new Map<
      number,
      {
        totalPiecesCompleted: number;
        attendanceStatusToday: AttendanceStatus | null;
        productivityPercent: number;
      }
    >();

    ids.forEach((id) => {
      result.set(id, {
        totalPiecesCompleted: 0,
        attendanceStatusToday: null,
        productivityPercent: 0,
      });
    });

    if (!ids.length) {
      return result;
    }

    const today = this.toDateKey(new Date());
    const [productionRows, attendances] = await Promise.all([
      this.productionRepository
        .createQueryBuilder('production')
        .select('production.workerId', 'workerId')
        .addSelect('COALESCE(SUM(production.piecesCompleted), 0)', 'totalPieces')
        .where('production.workerId IN (:...ids)', { ids })
        .groupBy('production.workerId')
        .getRawMany<{ workerId: number | string; totalPieces: number | string }>(),
      this.attendanceRepository
        .createQueryBuilder('attendance')
        .select(['attendance.id', 'attendance.status'])
        .addSelect('attendance.workerId', 'workerId')
        .where('attendance.workerId IN (:...ids)', { ids })
        .andWhere('attendance.date = :today', { today })
        .getRawMany<{ workerId: number | string; attendance_status: AttendanceStatus }>(),
    ]);

    for (const row of productionRows) {
      const workerId = Number(row.workerId);
      const totalPiecesCompleted = Number(row.totalPieces ?? 0);
      const current = result.get(workerId);
      if (current) {
        current.totalPiecesCompleted = totalPiecesCompleted;
        current.productivityPercent =
          this.calculateProductivityPercent(totalPiecesCompleted);
      }
    }

    for (const row of attendances) {
      const workerId = Number(row.workerId);
      const current = result.get(workerId);
      if (current) {
        current.attendanceStatusToday = row.attendance_status;
      }
    }

    return result;
  }

  private async getAttendanceSummary(workerId: number) {
    const rows = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('attendance.status', 'status')
      .addSelect('COUNT(attendance.id)', 'count')
      .where('attendance.workerId = :workerId', { workerId })
      .groupBy('attendance.status')
      .getRawMany<{ status: AttendanceStatus; count: number | string }>();

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
    const row = await this.productionRepository
      .createQueryBuilder('production')
      .select('COALESCE(SUM(production.piecesCompleted), 0)', 'totalPieces')
      .addSelect('COALESCE(SUM(production.totalAmount), 0)', 'totalAmount')
      .where('production.workerId = :workerId', { workerId })
      .getRawOne<{ totalPieces: number | string; totalAmount: number | string }>();

    const totalPieces = Number(row?.totalPieces ?? 0);
    return {
      totalPieces,
      totalAmount: Number(row?.totalAmount ?? 0),
      productivityPercent: this.calculateProductivityPercent(totalPieces),
    };
  }

  private toWorkerResponse(
    worker: Worker,
    computed?: {
      totalPiecesCompleted: number;
      attendanceStatusToday: AttendanceStatus | null;
      productivityPercent: number;
    },
  ) {
    return {
      id: worker.id,
      fullName: worker.fullName,
      phone: worker.phone,
      role: worker.role,
      salaryType: worker.salaryType,
      salaryValue: worker.salaryValue,
      startDate: worker.startDate,
      status: worker.status,
      notes: worker.notes,
      totalPiecesCompleted: computed?.totalPiecesCompleted ?? 0,
      attendanceStatusToday: computed?.attendanceStatusToday ?? null,
      productivityPercent: computed?.productivityPercent ?? 0,
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
    };
  }

  private calculateProductionAmount(piecesCompleted: number, piecePrice: number) {
    if (piecesCompleted < 0 || piecePrice < 0) {
      throw new BadRequestException('Production pieces and price must be positive.');
    }

    return piecesCompleted * piecePrice;
  }

  private calculateProductivityPercent(totalPieces: number) {
    return Math.min(
      100,
      Math.round((totalPieces / PRODUCTIVITY_TARGET_PIECES) * 100),
    );
  }

  private normalizePage(page?: number) {
    const value = Number(page ?? DEFAULT_PAGE);
    return Number.isFinite(value) ? Math.max(value, 1) : DEFAULT_PAGE;
  }

  private normalizeLimit(limit?: number) {
    const value = Number(limit ?? DEFAULT_LIMIT);
    return Number.isFinite(value)
      ? Math.min(Math.max(value, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;
  }

  private normalizeSortBy(sortBy?: string) {
    const allowed = new Set([
      'id',
      'fullName',
      'phone',
      'role',
      'salaryType',
      'salaryValue',
      'startDate',
      'status',
      'createdAt',
      'updatedAt',
    ]);

    return allowed.has(sortBy ?? '') ? sortBy! : 'createdAt';
  }

  private toDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private currentMonthRange() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return {
      start: this.toDateKey(start),
      end: this.toDateKey(end),
    };
  }

  private applyDateFilters(
    qb: { andWhere: (condition: string, parameters: Record<string, string>) => unknown },
    column: string,
    filters: PeriodFilters,
  ) {
    if (filters.startDate) {
      qb.andWhere(`${column} >= :startDate`, { startDate: filters.startDate });
    }

    if (filters.endDate) {
      qb.andWhere(`${column} <= :endDate`, { endDate: filters.endDate });
    }
  }
}
