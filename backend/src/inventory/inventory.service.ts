import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import {
  InventoryCategory,
  MovementType,
  PaymentMethod,
  StockStatus,
  SupplierAdvanceStatus,
  SupplierPurchaseStatus,
  SupplierStatus,
} from '../common/enums';
import { CreateMaterialPurchaseDto } from './dto/create-material-purchase.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateSupplierAdvanceDto } from './dto/create-supplier-advance.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { InventoryFilterDto } from './dto/inventory-filter.dto';
import { SupplierFilterDto } from './dto/supplier-filter.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryItem } from './entities/inventory-item.entity';
import { MaterialConsumption } from './entities/material-consumption.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { SupplierAdvance } from './entities/supplier-advance.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierPurchase } from './entities/supplier-purchase.entity';
import { Supplier } from './entities/supplier.entity';

type PaginationPayload = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type SupplierSelection = {
  supplier: string | null;
  supplierEntity: Supplier | null;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;

@Injectable()
export class InventoryService implements OnModuleInit {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemsRepository: Repository<InventoryItem>,
    @InjectRepository(StockMovement)
    private readonly movementsRepository: Repository<StockMovement>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(SupplierPurchase)
    private readonly purchasesRepository: Repository<SupplierPurchase>,
    @InjectRepository(SupplierPayment)
    private readonly supplierPaymentsRepository: Repository<SupplierPayment>,
    @InjectRepository(SupplierAdvance)
    private readonly supplierAdvancesRepository: Repository<SupplierAdvance>,
    @InjectRepository(MaterialConsumption)
    private readonly consumptionsRepository: Repository<MaterialConsumption>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    if (process.env.KHAYATI_ENABLE_DEMO_SEED === 'true') {
      await this.seedInventoryIfEmpty();
      await this.seedSupplierPurchasesIfEmpty();
    }
    await this.syncExistingInventoryState();
    await this.recalculateAllSuppliers();
  }

  async create(dto: CreateInventoryItemDto) {
    const supplierSelection = await this.resolveSupplierSelection(dto);
    const item = this.itemsRepository.create({
      name: this.normalizeRequiredText(dto.name, 'name'),
      reference: this.normalizeOptionalText(dto.reference),
      category: dto.category,
      type: this.normalizeOptionalText(dto.type),
      color: this.normalizeOptionalText(dto.color),
      quantity: dto.quantity,
      unit: this.normalizeRequiredText(dto.unit, 'unit'),
      unitPrice: dto.unitPrice,
      supplier: supplierSelection.supplier,
      supplierEntity: supplierSelection.supplierEntity,
      minStockAlert: dto.minStockAlert,
      location: this.normalizeOptionalText(dto.location),
      status: this.deriveStatus(dto.quantity, dto.minStockAlert),
      description: this.normalizeOptionalText(dto.description ?? dto.notes),
    });

    const saved = await this.itemsRepository.save(item);
    return this.findOne(saved.id);
  }

  async findAll(query: InventoryFilterDto = {}) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const sortBy = this.normalizeSortBy(query.sortBy);
    const sortOrder = query.sortOrder ?? 'ASC';

    const qb = this.itemsRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.supplierEntity', 'supplierEntity');

    this.applyItemFilters(qb, query);

    qb.orderBy(this.resolveSortColumn(sortBy), sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return this.buildListResponse(
      items.map((item) => this.serializeItem(item)),
      this.buildPagination(page, limit, total),
    );
  }

  async findOne(id: number) {
    const item = await this.itemsRepository.findOne({
      where: { id },
      relations: {
        supplierEntity: true,
        stockMovements: true,
        materialConsumptions: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Inventory item with id ${id} was not found.`,
      );
    }

    const sortedMovements = [...item.stockMovements].sort((left, right) =>
      this.compareByDateDesc(
        left.date,
        right.date,
        left.createdAt,
        right.createdAt,
      ),
    );
    const sortedConsumptions = [...item.materialConsumptions].sort(
      (left, right) =>
        this.compareByDateDesc(
          left.date,
          right.date,
          left.createdAt,
          right.createdAt,
        ),
    );

    return {
      ...this.serializeItem(item),
      supplierDetails: item.supplierEntity
        ? this.serializeSupplierDetail(item.supplierEntity)
        : null,
      movements: sortedMovements.map((movement) =>
        this.serializeMovement(movement, item),
      ),
      materialConsumptions: sortedConsumptions.map((consumption) =>
        this.serializeConsumption(consumption, item.id),
      ),
    };
  }

  async update(id: number, dto: UpdateInventoryItemDto) {
    const item = await this.findItemEntityOrFail(id);

    if (dto.name !== undefined) {
      item.name = this.normalizeRequiredText(dto.name, 'name');
    }

    if (dto.reference !== undefined) {
      item.reference = this.normalizeOptionalText(dto.reference);
    }

    if (dto.category !== undefined) {
      item.category = dto.category;
    }

    if (dto.type !== undefined) {
      item.type = this.normalizeOptionalText(dto.type);
    }

    if (dto.color !== undefined) {
      item.color = this.normalizeOptionalText(dto.color);
    }

    if (dto.quantity !== undefined) {
      item.quantity = dto.quantity;
    }

    if (dto.unit !== undefined) {
      item.unit = this.normalizeRequiredText(dto.unit, 'unit');
    }

    if (dto.unitPrice !== undefined) {
      item.unitPrice = dto.unitPrice;
    }

    if (dto.minStockAlert !== undefined) {
      item.minStockAlert = dto.minStockAlert;
    }

    if (dto.location !== undefined) {
      item.location = this.normalizeOptionalText(dto.location);
    }

    if (dto.description !== undefined || dto.notes !== undefined) {
      item.description = this.normalizeOptionalText(
        dto.description ?? dto.notes,
      );
    }

    if (dto.supplierId !== undefined || dto.supplier !== undefined) {
      const supplierSelection = await this.resolveSupplierSelection(dto, item);
      item.supplier = supplierSelection.supplier;
      item.supplierEntity = supplierSelection.supplierEntity;
    }

    item.status = this.deriveStatus(item.quantity, item.minStockAlert);

    await this.itemsRepository.save(item);
    return this.findOne(item.id);
  }

  async remove(id: number) {
    const item = await this.findItemEntityOrFail(id);
    await this.itemsRepository.remove(item);

    return {
      deleted: true,
      id,
    };
  }

  async getStats() {
    const { start, end } = this.currentMonthRange();
    const [
      totalMaterials,
      monthlyPurchases,
      monthlyPurchaseRow,
      suppliersDebtRow,
      activeSuppliers,
    ] =
      await Promise.all([
        this.itemsRepository.count(),
        this.purchasesRepository
          .createQueryBuilder('purchase')
          .where('purchase.purchaseDate BETWEEN :start AND :end', { start, end })
          .getCount(),
        this.purchasesRepository
          .createQueryBuilder('purchase')
          .select('COALESCE(SUM(purchase.totalAmount), 0)', 'total')
          .where('purchase.purchaseDate BETWEEN :start AND :end', { start, end })
          .getRawOne<{ total: string | number | null }>(),
        this.suppliersRepository
          .createQueryBuilder('supplier')
          .select('COALESCE(SUM(supplier.totalDebt), 0)', 'total')
          .getRawOne<{ total: string | number | null }>(),
        this.suppliersRepository.count({
          where: { status: SupplierStatus.ACTIVE },
        }),
      ]);
    const monthlyPurchaseAmount = this.roundMoney(Number(monthlyPurchaseRow?.total ?? 0));
    const supplierDebt = this.roundMoney(Number(suppliersDebtRow?.total ?? 0));

    return {
      totalMaterials,
      totalItems: totalMaterials,
      monthlyPurchases,
      monthlyPurchaseAmount,
      supplierDebt,
      activeSuppliers,
      lowStockMaterials: 0,
      lowStock: 0,
      stockValue: monthlyPurchaseAmount,
      monthlyMovements: monthlyPurchases,
      movementsCount: monthlyPurchases,
    };
  }

  async calculateStockValue() {
    const row = await this.itemsRepository
      .createQueryBuilder('item')
      .select('COALESCE(SUM(item.quantity * item.unitPrice), 0)', 'totalValue')
      .getRawOne<{ totalValue: number | string | null }>();

    return {
      totalValue: Math.round(Number(row?.totalValue ?? 0)),
    };
  }

  async getLowStock(query: InventoryFilterDto = {}) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);

    const qb = this.itemsRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.supplierEntity', 'supplierEntity');

    this.applyItemFilters(qb, query, true);
    qb.andWhere('item.quantity <= item.minStockAlert')
      .orderBy('item.quantity', 'ASC')
      .addOrderBy('item.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return this.buildListResponse(
      items.map((item) => this.serializeItem(item)),
      this.buildPagination(page, limit, total),
    );
  }

  async createMovement(dto: CreateStockMovementDto) {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.getRepository(InventoryItem).findOne({
        where: { id: dto.inventoryItemId },
      });
      if (!item) {
        throw new NotFoundException(
          `Inventory item with id ${dto.inventoryItemId} was not found.`,
        );
      }

      const quantity = dto.quantity;
      if (dto.type !== MovementType.ADJUSTMENT && quantity <= 0) {
        throw new BadRequestException(
          'Movement quantity must be greater than zero.',
        );
      }

      const previousQuantity = item.quantity;
      const newQuantity = this.calculateQuantityAfterMovement(
        dto.type,
        previousQuantity,
        quantity,
      );
      if (newQuantity < 0) {
        throw new BadRequestException('Stock quantity cannot become negative.');
      }

      item.quantity = newQuantity;
      item.status = this.deriveStatus(newQuantity, item.minStockAlert);
      await manager.getRepository(InventoryItem).save(item);

      const savedMovement = await manager.getRepository(StockMovement).save(
        manager.getRepository(StockMovement).create({
          inventoryItem: item,
          type: dto.type,
          quantity,
          previousQuantity,
          newQuantity,
          unitSnapshot: item.unit,
          reason: this.normalizeOptionalText(dto.reason),
          reference: this.normalizeOptionalText(dto.reference),
          date: this.normalizeDate(dto.date),
          notes: this.normalizeOptionalText(dto.notes),
          performedBy: this.normalizeOptionalText(dto.performedBy),
        }),
      );

      if (dto.type === MovementType.PRODUCTION) {
        await manager.getRepository(MaterialConsumption).save(
          manager.getRepository(MaterialConsumption).create({
            inventoryItem: item,
            quantityUsed: quantity,
            date: savedMovement.date,
            reference: savedMovement.reference,
            cost: this.roundMoney(quantity * item.unitPrice),
            notes: this.normalizeOptionalText(dto.notes ?? dto.reason),
          }),
        );
      }

      return this.serializeMovement(savedMovement, item);
    });
  }

  async getMovements(query: InventoryFilterDto = {}) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);

    const qb = this.movementsRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.inventoryItem', 'item');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(item.name LIKE :search OR movement.reason LIKE :search OR movement.reference LIKE :search)',
        { search },
      );
    }

    if (query.category) {
      qb.andWhere('item.category = :category', { category: query.category });
    }

    if (query.supplier?.trim()) {
      qb.andWhere('item.supplier = :supplier', {
        supplier: query.supplier.trim(),
      });
    }

    qb.orderBy('movement.date', 'DESC')
      .addOrderBy('movement.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [movements, total] = await qb.getManyAndCount();

    return this.buildListResponse(
      movements.map((movement) =>
        this.serializeMovement(movement, movement.inventoryItem),
      ),
      this.buildPagination(page, limit, total),
    );
  }

  async getSuppliers(query: SupplierFilterDto = {}) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const sortBy = query.sortBy ?? 'name';
    const sortOrder = query.sortOrder ?? 'ASC';
    const qb = this.suppliersRepository.createQueryBuilder('supplier');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(supplier.name LIKE :search OR supplier.phone LIKE :search OR supplier.address LIKE :search OR supplier.city LIKE :search OR supplier.notes LIKE :search)',
        { search },
      );
    }
    if (query.status) qb.andWhere('supplier.status = :status', { status: query.status });
    if (!query.status) {
      qb.andWhere('supplier.status != :archived', {
        archived: SupplierStatus.ARCHIVED,
      });
    }

    qb.orderBy(`supplier.${sortBy}`, sortOrder)
      .addOrderBy('supplier.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [suppliers, total] = await qb.getManyAndCount();
    return {
      data: suppliers.map((supplier) => this.serializeSupplierDetail(supplier)),
      pagination: this.buildPagination(page, limit, total),
    };
  }

  async getSupplierStats() {
    const raw = await this.suppliersRepository
      .createQueryBuilder('supplier')
      .select('COUNT(supplier.id)', 'totalSuppliers')
      .addSelect(
        `SUM(CASE WHEN supplier.status = :active THEN 1 ELSE 0 END)`,
        'activeSuppliers',
      )
      .addSelect('COALESCE(SUM(supplier.totalPurchases), 0)', 'totalPurchases')
      .addSelect('COALESCE(SUM(supplier.totalPaid), 0)', 'totalPaid')
      .addSelect('COALESCE(SUM(supplier.totalDebt), 0)', 'totalDebt')
      .setParameter('active', SupplierStatus.ACTIVE)
      .getRawOne<Record<string, string | number | null>>();

    return {
      totalSuppliers: Number(raw?.totalSuppliers ?? 0),
      activeSuppliers: Number(raw?.activeSuppliers ?? 0),
      totalPurchases: this.roundMoney(Number(raw?.totalPurchases ?? 0)),
      totalPaid: this.roundMoney(Number(raw?.totalPaid ?? 0)),
      totalDebt: this.roundMoney(Number(raw?.totalDebt ?? 0)),
    };
  }

  async createSupplier(dto: CreateSupplierDto) {
    const supplier = await this.upsertSupplierByName({
      name: dto.name,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      status: dto.status,
      notes: dto.notes,
    });

    return this.serializeSupplierDetail(supplier);
  }

  async updateSupplier(id: number, dto: CreateSupplierDto) {
    const supplier = await this.findSupplierOrFail(id);
    if (dto.name !== undefined) supplier.name = this.normalizeRequiredText(dto.name, 'supplier name');
    if (dto.phone !== undefined) supplier.phone = this.normalizeOptionalText(dto.phone);
    if (dto.address !== undefined) supplier.address = this.normalizeOptionalText(dto.address);
    if (dto.city !== undefined) supplier.city = this.normalizeOptionalText(dto.city);
    if (dto.notes !== undefined) supplier.notes = this.normalizeOptionalText(dto.notes);
    if (dto.status !== undefined) {
      supplier.status = dto.status;
      supplier.archivedAt = dto.status === SupplierStatus.ARCHIVED ? new Date() : null;
    }
    await this.suppliersRepository.save(supplier);
    return this.serializeSupplierDetail(supplier);
  }

  async archiveSupplier(id: number) {
    const supplier = await this.findSupplierOrFail(id);
    supplier.status = SupplierStatus.ARCHIVED;
    supplier.archivedAt = new Date();
    await this.suppliersRepository.save(supplier);
    return { archived: true, supplier: this.serializeSupplierDetail(supplier) };
  }

  async findSupplierProfile(id: number) {
    const supplier = await this.suppliersRepository.findOne({
      where: { id },
      relations: {
        purchases: { inventoryItem: true, payments: true },
        payments: { purchase: true },
        advances: true,
      },
    });
    if (!supplier) throw new NotFoundException(`Supplier with id ${id} was not found.`);
    supplier.purchases.sort((left, right) => right.purchaseDate.localeCompare(left.purchaseDate) || right.id - left.id);
    supplier.payments.sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id);
    supplier.advances.sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id);

    const purchases = supplier.purchases.map((purchase) =>
      this.serializePurchase(purchase, supplier),
    );
    const payments = supplier.payments.map((payment) =>
      this.serializeSupplierPayment(payment, supplier),
    );
    const advances = supplier.advances.map((advance) =>
      this.serializeSupplierAdvance(advance, supplier),
    );
    const averagePurchase = purchases.length
      ? this.roundMoney(supplier.totalPurchases / purchases.length)
      : 0;
    return {
      supplier: this.serializeSupplierDetail(supplier),
      statistics: {
        totalPurchases: supplier.totalPurchases,
        totalPaid: supplier.totalPaid,
        totalDebt: supplier.totalDebt,
        totalAdvances: this.roundMoney(advances.reduce((sum, advance) => sum + advance.amount, 0)),
        purchaseCount: purchases.length,
        lastPurchase: supplier.lastPurchaseDate ?? null,
        lastPayment: payments[0]?.date ?? null,
        averagePurchase,
      },
      purchases,
      payments,
      advances,
      history: this.buildSupplierHistory(purchases, payments, advances),
    };
  }

  async getMaterialPurchases(query: InventoryFilterDto = {}) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const qb = this.purchasesRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.supplier', 'supplier')
      .leftJoinAndSelect('purchase.inventoryItem', 'item');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(purchase.materialName LIKE :search OR purchase.materialColor LIKE :search OR supplier.name LIKE :search OR purchase.notes LIKE :search)',
        { search },
      );
    }
    if (query.supplier?.trim()) {
      qb.andWhere('supplier.name LIKE :supplier', { supplier: `%${query.supplier.trim()}%` });
    }
    if (query.category) qb.andWhere('item.category = :category', { category: query.category });

    qb.orderBy('purchase.purchaseDate', 'DESC')
      .addOrderBy('purchase.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [purchases, total] = await qb.getManyAndCount();
    return {
      data: purchases.map((purchase) => this.serializePurchase(purchase)),
      pagination: this.buildPagination(page, limit, total),
    };
  }

  async createMaterialPurchase(dto: CreateMaterialPurchaseDto) {
    const purchaseId = await this.dataSource.transaction(async (manager) => {
      const supplier = await this.resolvePurchaseSupplier(manager, dto);
      const item = await this.resolvePurchasedMaterial(manager, dto, supplier);
      const totalAmount = this.roundMoney(dto.totalAmount);
      const paidAmount = this.roundMoney(dto.paidAmount ?? 0);
      if (paidAmount > totalAmount) {
        throw new BadRequestException('paidAmount cannot exceed totalAmount.');
      }

      const purchase = await manager.getRepository(SupplierPurchase).save(
        manager.getRepository(SupplierPurchase).create({
          supplier,
          inventoryItem: item,
          materialName: item.name,
          materialColor: item.color,
          quantityPurchased: this.roundQuantity(dto.quantityPurchased),
          unit: item.unit,
          totalAmount,
          paidAmount,
          remainingAmount: this.roundMoney(totalAmount - paidAmount),
          paymentStatus: this.purchaseStatus(totalAmount, paidAmount),
          purchaseDate: dto.purchaseDate ?? this.toDateKey(new Date()),
          notes: this.normalizeOptionalText(dto.notes),
        }),
      );

      if (paidAmount > 0) {
        await manager.getRepository(SupplierPayment).save(
          manager.getRepository(SupplierPayment).create({
            supplier,
            purchase,
            amount: paidAmount,
            paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
            date: purchase.purchaseDate,
            notes: 'Initial supplier purchase payment',
          }),
        );
      }

      await this.recalculateSupplier(manager, supplier.id);
      return purchase.id;
    });

    const purchase = await this.purchasesRepository.findOne({
      where: { id: purchaseId },
      relations: { supplier: true, inventoryItem: true, payments: true },
    });
    if (!purchase) throw new NotFoundException('Purchase not found.');
    return this.serializePurchase(purchase);
  }

  async createSupplierPayment(dto: CreateSupplierPaymentDto) {
    const paymentId = await this.dataSource.transaction(async (manager) => {
      const supplier = await this.findSupplierOrFail(dto.supplierId, manager);
      let purchase: SupplierPurchase | null = null;
      if (dto.purchaseId) {
        purchase = await manager.getRepository(SupplierPurchase).findOne({
          where: { id: dto.purchaseId },
          relations: { supplier: true },
        });
        if (!purchase) throw new NotFoundException(`Purchase ${dto.purchaseId} was not found.`);
        if (purchase.supplier.id !== supplier.id) {
          throw new BadRequestException('purchaseId does not belong to this supplier.');
        }
        if (dto.amount > purchase.remainingAmount) {
          throw new BadRequestException(`Payment exceeds remaining amount (${purchase.remainingAmount}).`);
        }
        purchase.paidAmount = this.roundMoney(purchase.paidAmount + dto.amount);
        purchase.remainingAmount = this.roundMoney(purchase.totalAmount - purchase.paidAmount);
        purchase.paymentStatus = this.purchaseStatus(purchase.totalAmount, purchase.paidAmount);
        await manager.getRepository(SupplierPurchase).save(purchase);
      }

      const payment = await manager.getRepository(SupplierPayment).save(
        manager.getRepository(SupplierPayment).create({
          supplier,
          purchase,
          amount: this.roundMoney(dto.amount),
          paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
          date: dto.date ?? this.toDateKey(new Date()),
          reference: this.normalizeOptionalText(dto.reference),
          notes: this.normalizeOptionalText(dto.notes),
        }),
      );
      await this.recalculateSupplier(manager, supplier.id);
      return payment.id;
    });

    const payment = await this.supplierPaymentsRepository.findOne({
      where: { id: paymentId },
      relations: { supplier: true, purchase: true },
    });
    if (!payment) throw new NotFoundException('Supplier payment not found.');
    return this.serializeSupplierPayment(payment);
  }

  async createSupplierAdvance(supplierId: number, dto: CreateSupplierAdvanceDto) {
    const advanceId = await this.dataSource.transaction(async (manager) => {
      const supplier = await this.findSupplierOrFail(supplierId, manager);
      const amount = this.roundMoney(dto.amount);
      const debtBefore = this.roundMoney(supplier.totalDebt ?? 0);
      if (debtBefore <= 0) {
        throw new BadRequestException(
          'Supplier does not have an outstanding debt.',
        );
      }
      if (amount > debtBefore) {
        throw new BadRequestException(
          `Advance cannot exceed current supplier debt (${debtBefore}).`,
        );
      }
      const debtAfter = this.roundMoney(Math.max(debtBefore - amount, 0));
      const advance = await manager.getRepository(SupplierAdvance).save(
        manager.getRepository(SupplierAdvance).create({
          supplier,
          amount,
          appliedAmount: 0,
          remainingAmount: debtAfter,
          debtBefore,
          debtAfter,
          status: SupplierAdvanceStatus.OPEN,
          date: dto.date ?? this.toDateKey(new Date()),
          notes: this.normalizeOptionalText(dto.notes),
        }),
      );
      await this.recalculateSupplier(manager, supplier.id);
      return advance.id;
    });

    const advance = await this.supplierAdvancesRepository.findOne({
      where: { id: advanceId },
      relations: { supplier: true },
    });
    if (!advance) throw new NotFoundException('Supplier advance not found.');
    return this.serializeSupplierAdvance(advance);
  }

  async getConsumptionAnalysis() {
    const { start, end } = this.currentMonthRange();

    const [materials, productions, monthlyCostRow] = await Promise.all([
      this.consumptionsRepository
        .createQueryBuilder('consumption')
        .leftJoin('consumption.inventoryItem', 'item')
        .select('item.name', 'name')
        .addSelect('COALESCE(SUM(consumption.quantityUsed), 0)', 'quantityUsed')
        .addSelect('COALESCE(SUM(consumption.cost), 0)', 'totalCost')
        .where('consumption.date BETWEEN :start AND :end', { start, end })
        .groupBy('item.id')
        .addGroupBy('item.name')
        .orderBy('COALESCE(SUM(consumption.quantityUsed), 0)', 'DESC')
        .addOrderBy('COALESCE(SUM(consumption.cost), 0)', 'DESC')
        .getRawMany<{
          name: string;
          quantityUsed: string;
          totalCost: string;
        }>(),
      this.consumptionsRepository
        .createQueryBuilder('consumption')
        .select('consumption.reference', 'reference')
        .addSelect('COALESCE(SUM(consumption.cost), 0)', 'productionCost')
        .where('consumption.date BETWEEN :start AND :end', { start, end })
        .andWhere('consumption.reference IS NOT NULL')
        .andWhere("consumption.reference != ''")
        .groupBy('consumption.reference')
        .getRawMany<{ reference: string; productionCost: string }>(),
      this.consumptionsRepository
        .createQueryBuilder('consumption')
        .select('COALESCE(SUM(consumption.cost), 0)', 'monthlyCost')
        .where('consumption.date BETWEEN :start AND :end', { start, end })
        .getRawOne<{ monthlyCost: string | number | null }>(),
    ]);

    const monthlyCost = Math.round(Number(monthlyCostRow?.monthlyCost ?? 0));
    const averageProductionCost = productions.length
      ? Math.round(
          productions.reduce(
            (sum, production) => sum + Number(production.productionCost ?? 0),
            0,
          ) / productions.length,
        )
      : 0;

    return {
      mostConsumedMaterial: materials[0]?.name ?? null,
      monthlyCost,
      averageProductionCost,
    };
  }

  private async seedInventoryIfEmpty() {
    const existingItems = await this.itemsRepository.count();
    if (existingItems > 0) {
      return;
    }

    const fabricSupplier = await this.upsertSupplierByName({
      name: 'Dar Tissus Centrale',
      phone: '0550112233',
      address: 'Alger',
      notes: 'Fournisseur principal de tissus.',
    });
    const threadSupplier = await this.upsertSupplierByName({
      name: 'Maison du Fil',
      phone: '0550223344',
      address: 'Oran',
      notes: 'Fils et petites fournitures.',
    });
    const zipperSupplier = await this.upsertSupplierByName({
      name: 'Accessoires Atelier',
      phone: '0550334455',
      address: 'Constantine',
      notes: 'Fermetures et accessoires.',
    });

    const fabric = await this.itemsRepository.save(
      this.itemsRepository.create({
        name: '\u0642\u0645\u0627\u0634 \u0642\u0637\u0646\u064A',
        reference: 'MAT-FAB-001',
        category: InventoryCategory.FABRIC,
        type: '\u0642\u0637\u0646 100%',
        color: '\u0623\u0628\u064A\u0636',
        quantity: 160,
        unit: '\u0645\u062A\u0631',
        unitPrice: 500,
        supplier: fabricSupplier.name,
        supplierEntity: fabricSupplier,
        minStockAlert: 40,
        location: 'A-01',
        status: this.deriveStatus(160, 40),
        description:
          '\u0645\u062E\u0635\u0635 \u0644\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0642\u0645\u0635\u0627\u0646.',
      }),
    );

    const thread = await this.itemsRepository.save(
      this.itemsRepository.create({
        name: '\u062E\u064A\u0637 \u0623\u0633\u0648\u062F',
        reference: 'MAT-THR-001',
        category: InventoryCategory.THREAD,
        type: '\u0628\u0648\u0644\u064A\u0633\u062A\u0631',
        color: '\u0623\u0633\u0648\u062F',
        quantity: 60,
        unit: '\u0628\u0643\u0631\u0629',
        unitPrice: 150,
        supplier: threadSupplier.name,
        supplierEntity: threadSupplier,
        minStockAlert: 60,
        location: 'B-02',
        status: this.deriveStatus(60, 60),
        description:
          '\u062E\u064A\u0637 \u0644\u0623\u0639\u0645\u0627\u0644 \u0627\u0644\u062E\u064A\u0627\u0637\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629.',
      }),
    );

    const zipper = await this.itemsRepository.save(
      this.itemsRepository.create({
        name: '\u0633\u062D\u0627\u0628',
        reference: 'MAT-ZIP-001',
        category: InventoryCategory.ZIPPER,
        type: '\u0645\u0639\u062F\u0646\u064A',
        color: '\u0631\u0645\u0627\u062F\u064A',
        quantity: 100,
        unit: '\u0642\u0637\u0639\u0629',
        unitPrice: 120,
        supplier: zipperSupplier.name,
        supplierEntity: zipperSupplier,
        minStockAlert: 20,
        location: 'C-01',
        status: this.deriveStatus(100, 20),
        description:
          '\u0633\u062D\u0627\u0628\u0627\u062A \u0644\u0644\u0639\u0628\u0627\u064A\u0627\u062A \u0648\u0627\u0644\u0633\u0631\u0627\u0648\u064A\u0644.',
      }),
    );

    const today = new Date();
    const purchaseDate = this.toDateKey(this.shiftDate(today, -6));
    const threadOutDate = this.toDateKey(this.shiftDate(today, -3));
    const fabricUseDate = this.toDateKey(this.shiftDate(today, -1));
    const zipperUseDate = this.toDateKey(this.shiftDate(today, -2));

    await this.createMovement({
      inventoryItemId: fabric.id,
      type: MovementType.IN,
      quantity: 40,
      reason: '\u0634\u0631\u0627\u0621 \u0642\u0645\u0627\u0634',
      date: purchaseDate,
      reference: 'PO-2026-0813',
      notes:
        '\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062F\u0641\u0639\u0629 \u0642\u0645\u0627\u0634 \u062C\u062F\u064A\u062F\u0629.',
    });

    await this.createMovement({
      inventoryItemId: thread.id,
      type: MovementType.OUT,
      quantity: 10,
      reason: '\u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u062E\u064A\u0637',
      date: threadOutDate,
      reference: 'ORD-2026-0816-01',
      notes:
        '\u0627\u0633\u062A\u0639\u0645\u0627\u0644 \u0641\u064A \u0637\u0644\u0628\u064A\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629.',
    });

    await this.consumptionsRepository.save([
      this.consumptionsRepository.create({
        inventoryItem: fabric,
        quantityUsed: 24,
        date: fabricUseDate,
        reference: 'LEGACY-PROD-001',
        cost: 12000,
        notes:
          '\u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0642\u0645\u0627\u0634 \u0644\u062F\u0641\u0639\u0629 \u0625\u0646\u062A\u0627\u062C.',
      }),
      this.consumptionsRepository.create({
        inventoryItem: zipper,
        quantityUsed: 8,
        date: zipperUseDate,
        reference: 'LEGACY-PROD-002',
        cost: 960,
        notes:
          '\u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0633\u062D\u0627\u0628\u0627\u062A \u0644\u0642\u0637\u0639 \u062C\u062F\u064A\u062F\u0629.',
      }),
    ]);
  }

  private async seedSupplierPurchasesIfEmpty() {
    if ((await this.purchasesRepository.count()) > 0) return;

    const materials = await this.itemsRepository.find({
      relations: { supplierEntity: true },
      order: { id: 'ASC' },
    });
    if (!materials.length) return;

    const today = new Date();
    const samples = [
      {
        item: materials.find((item) => item.name.includes('قماش')) ?? materials[0],
        date: this.toDateKey(this.shiftDate(today, -10)),
        totalAmount: 48000,
        paidAmount: 30000,
        notes: 'Achat de tissu coton noir',
      },
      {
        item: materials.find((item) => item.name.includes('خيط')) ?? materials[0],
        date: this.toDateKey(this.shiftDate(today, -5)),
        totalAmount: 15000,
        paidAmount: 15000,
        notes: 'Achat de fil pour production',
      },
      {
        item: materials.find((item) => item.name.includes('سحاب')) ?? materials[0],
        date: this.toDateKey(this.shiftDate(today, -2)),
        totalAmount: 25000,
        paidAmount: 10000,
        notes: 'Approvisionnement accessoires',
      },
    ];

    for (const sample of samples) {
      const supplier =
        sample.item.supplierEntity ??
        (sample.item.supplier
          ? await this.upsertSupplierByName({ name: sample.item.supplier })
          : await this.upsertSupplierByName({ name: 'Fournisseur atelier' }));
      await this.createMaterialPurchase({
        inventoryItemId: sample.item.id,
        materialName: sample.item.name,
        color: sample.item.color ?? undefined,
        quantityPurchased: Math.max(1, Math.round(sample.item.quantity / 3)),
        unit: sample.item.unit,
        totalAmount: sample.totalAmount,
        paidAmount: sample.paidAmount,
        paymentMethod: PaymentMethod.CASH,
        supplierId: supplier.id,
        purchaseDate: sample.date,
        notes: sample.notes,
      });
    }
  }

  private async syncExistingInventoryState() {
    const items = await this.itemsRepository.find({
      relations: { supplierEntity: true },
    });

    if (!items.length) {
      return;
    }

    let hasChanges = false;

    for (const item of items) {
      const derivedStatus = this.deriveStatus(
        item.quantity,
        item.minStockAlert,
      );
      if (item.status !== derivedStatus) {
        item.status = derivedStatus;
        hasChanges = true;
      }

      if (item.supplierEntity) {
        if (item.supplier !== item.supplierEntity.name) {
          item.supplier = item.supplierEntity.name;
          hasChanges = true;
        }
        continue;
      }

      if (item.supplier?.trim()) {
        item.supplierEntity = await this.upsertSupplierByName({
          name: item.supplier,
        });
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.itemsRepository.save(items);
    }
  }

  private async resolvePurchaseSupplier(
    manager: EntityManager,
    dto: CreateMaterialPurchaseDto,
  ) {
    if (dto.supplierId) {
      return this.findSupplierOrFail(dto.supplierId, manager);
    }
    if (dto.newSupplier?.name) {
      return this.upsertSupplierByName(dto.newSupplier, manager);
    }
    throw new BadRequestException('supplierId or newSupplier is required.');
  }

  private async resolvePurchasedMaterial(
    manager: EntityManager,
    dto: CreateMaterialPurchaseDto,
    supplier: Supplier,
  ) {
    const repository = manager.getRepository(InventoryItem);
    if (dto.inventoryItemId) {
      const item = await repository.findOne({
        where: { id: dto.inventoryItemId },
        relations: { supplierEntity: true },
      });
      if (!item) {
        throw new NotFoundException(`Inventory item ${dto.inventoryItemId} was not found.`);
      }
      item.quantity = this.roundQuantity(item.quantity + dto.quantityPurchased);
      item.unitPrice =
        dto.quantityPurchased > 0
          ? this.roundMoney(dto.totalAmount / dto.quantityPurchased)
          : item.unitPrice;
      item.supplier = supplier.name;
      item.supplierEntity = supplier;
      if (dto.color !== undefined) item.color = this.normalizeOptionalText(dto.color);
      await repository.save(item);
      return item;
    }

    const materialName = this.normalizeRequiredText(dto.materialName, 'materialName');
    const color = this.normalizeOptionalText(dto.color);
    const existingQb = repository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.supplierEntity', 'supplierEntity')
      .where('LOWER(item.name) = LOWER(:name)', { name: materialName });
    if (color) {
      existingQb.andWhere('item.color = :color', { color });
    } else {
      existingQb.andWhere("(item.color IS NULL OR item.color = '')");
    }
    const existing = await existingQb.getOne();

    if (existing) {
      existing.quantity = this.roundQuantity(existing.quantity + dto.quantityPurchased);
      existing.unit = this.normalizeRequiredText(dto.unit, 'unit');
      existing.unitPrice =
        dto.quantityPurchased > 0
          ? this.roundMoney(dto.totalAmount / dto.quantityPurchased)
          : existing.unitPrice;
      existing.supplier = supplier.name;
      existing.supplierEntity = supplier;
      await repository.save(existing);
      return existing;
    }

    return repository.save(
      repository.create({
        name: materialName,
        category: dto.category ?? InventoryCategory.FABRIC,
        color,
        quantity: this.roundQuantity(dto.quantityPurchased),
        unit: this.normalizeRequiredText(dto.unit, 'unit'),
        unitPrice:
          dto.quantityPurchased > 0
            ? this.roundMoney(dto.totalAmount / dto.quantityPurchased)
            : 0,
        supplier: supplier.name,
        supplierEntity: supplier,
        minStockAlert: 0,
        status: StockStatus.AVAILABLE,
        description: this.normalizeOptionalText(dto.notes),
      }),
    );
  }

  private async recalculateAllSuppliers() {
    const suppliers = await this.suppliersRepository.find({ select: { id: true } });
    for (const supplier of suppliers) {
      await this.dataSource.transaction((manager) =>
        this.recalculateSupplier(manager, supplier.id),
      );
    }
  }

  private async recalculateSupplier(manager: EntityManager, supplierId: number) {
    const supplier = await manager.getRepository(Supplier).findOne({
      where: { id: supplierId },
    });
    if (!supplier) return;

    const [purchaseTotals, paymentTotals, advanceTotals] = await Promise.all([
      manager
        .getRepository(SupplierPurchase)
        .createQueryBuilder('purchase')
        .select('COALESCE(SUM(purchase.totalAmount), 0)', 'totalPurchases')
        .addSelect('MAX(purchase.purchaseDate)', 'lastPurchaseDate')
        .where('purchase.supplierId = :supplierId', { supplierId })
        .getRawOne<Record<string, string | number | null>>(),
      manager
        .getRepository(SupplierPayment)
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'totalPayments')
        .where('payment.supplierId = :supplierId', { supplierId })
        .getRawOne<Record<string, string | number | null>>(),
      manager
        .getRepository(SupplierAdvance)
        .createQueryBuilder('advance')
        .select('COALESCE(SUM(advance.amount), 0)', 'totalAdvances')
        .where('advance.supplierId = :supplierId', { supplierId })
        .getRawOne<Record<string, string | number | null>>(),
    ]);

    const totalPurchases = this.roundMoney(Number(purchaseTotals?.totalPurchases ?? 0));
    const totalPaid = this.roundMoney(
      Number(paymentTotals?.totalPayments ?? 0) +
        Number(advanceTotals?.totalAdvances ?? 0),
    );
    supplier.totalPurchases = totalPurchases;
    supplier.totalPaid = totalPaid;
    supplier.totalDebt = this.roundMoney(Math.max(totalPurchases - totalPaid, 0));
    supplier.lastPurchaseDate = purchaseTotals?.lastPurchaseDate
      ? String(purchaseTotals.lastPurchaseDate)
      : null;
    await manager.getRepository(Supplier).save(supplier);
  }

  private purchaseStatus(totalAmount: number, paidAmount: number) {
    if (paidAmount >= totalAmount) return SupplierPurchaseStatus.PAID;
    if (paidAmount > 0) return SupplierPurchaseStatus.PARTIAL;
    return SupplierPurchaseStatus.UNPAID;
  }

  private serializePurchase(
    purchase: SupplierPurchase,
    fallbackSupplier?: Supplier,
  ) {
    const supplier = purchase.supplier ?? fallbackSupplier;
    return {
      id: purchase.id,
      supplierId: supplier?.id ?? null,
      supplier: supplier?.name ?? null,
      inventoryItemId: purchase.inventoryItem?.id ?? null,
      materialName: purchase.materialName,
      name: purchase.materialName,
      color: purchase.materialColor ?? null,
      quantityPurchased: purchase.quantityPurchased,
      quantity: purchase.quantityPurchased,
      unit: purchase.unit,
      totalAmount: purchase.totalAmount,
      paidAmount: purchase.paidAmount,
      remainingAmount: purchase.remainingAmount,
      remaining: purchase.remainingAmount,
      paymentStatus: purchase.paymentStatus,
      status: purchase.paymentStatus,
      purchaseDate: purchase.purchaseDate,
      date: purchase.purchaseDate,
      notes: purchase.notes ?? null,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    };
  }

  private serializeSupplierPayment(
    payment: SupplierPayment,
    fallbackSupplier?: Supplier,
  ) {
    const supplier = payment.supplier ?? fallbackSupplier;
    return {
      id: payment.id,
      supplierId: supplier?.id ?? null,
      supplier: supplier?.name ?? null,
      purchaseId: payment.purchase?.id ?? null,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      date: payment.date,
      reference: payment.reference ?? null,
      notes: payment.notes ?? null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private serializeSupplierAdvance(
    advance: SupplierAdvance,
    fallbackSupplier?: Supplier,
  ) {
    const supplier = advance.supplier ?? fallbackSupplier;
    return {
      id: advance.id,
      supplierId: supplier?.id ?? null,
      supplier: supplier?.name ?? null,
      amount: advance.amount,
      appliedAmount: advance.appliedAmount,
      remainingAmount: advance.remainingAmount,
      debtBefore: advance.debtBefore ?? null,
      debtAfter: advance.debtAfter ?? null,
      status: advance.status,
      date: advance.date,
      notes: advance.notes ?? null,
      createdAt: advance.createdAt,
      updatedAt: advance.updatedAt,
    };
  }

  private buildSupplierHistory(
    purchases: ReturnType<InventoryService['serializePurchase']>[],
    payments: ReturnType<InventoryService['serializeSupplierPayment']>[],
    advances: ReturnType<InventoryService['serializeSupplierAdvance']>[],
  ) {
    return [
      ...purchases.map((purchase) => ({
        type: 'PURCHASE',
        date: purchase.purchaseDate,
        title: purchase.materialName,
        amount: purchase.totalAmount,
        reference: `PUR-${purchase.id}`,
      })),
      ...payments.map((payment) => ({
        type: 'PAYMENT',
        date: payment.date,
        title: 'Supplier payment',
        amount: payment.amount,
        reference: payment.reference,
      })),
      ...advances.map((advance) => ({
        type: 'ADVANCE',
        date: advance.date,
        title: 'Supplier advance',
        amount: advance.amount,
        reference: null,
      })),
    ].sort((left, right) => right.date.localeCompare(left.date));
  }

  private applyItemFilters(
    qb: SelectQueryBuilder<InventoryItem>,
    query: InventoryFilterDto,
    ignoreStatus = false,
  ) {
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(item.name LIKE :search OR item.reference LIKE :search OR item.type LIKE :search OR item.color LIKE :search OR item.supplier LIKE :search OR item.location LIKE :search OR item.description LIKE :search)',
        { search },
      );
    }

    if (query.category) {
      qb.andWhere('item.category = :category', { category: query.category });
    }

    if (!ignoreStatus && query.status) {
      qb.andWhere('item.status = :status', { status: query.status });
    }

    if (query.supplier?.trim()) {
      qb.andWhere('item.supplier = :supplier', {
        supplier: query.supplier.trim(),
      });
    }
  }

  private serializeItem(item: InventoryItem) {
    const status = this.deriveStatus(item.quantity, item.minStockAlert);
    const supplierName = item.supplierEntity?.name ?? item.supplier ?? null;

    return {
      id: item.id,
      name: item.name,
      reference: item.reference,
      category: item.category,
      type: item.type,
      color: item.color,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalValue: Math.round(item.quantity * item.unitPrice),
      supplier: supplierName,
      supplierId: item.supplierEntity?.id ?? null,
      minStockAlert: item.minStockAlert,
      location: item.location,
      status,
      description: item.description,
      notes: item.description,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private serializeMovement(movement: StockMovement, item: InventoryItem) {
    return {
      id: movement.id,
      inventoryItemId: item.id,
      inventoryItem: {
        id: item.id,
        name: item.name,
      },
      type: movement.type,
      movementType: movement.type,
      quantity: movement.quantity,
      previousQuantity: movement.previousQuantity,
      newQuantity: movement.newQuantity,
      unit: movement.unitSnapshot ?? item.unit,
      reason: movement.reason,
      reference: movement.reference,
      date: movement.date,
      notes: movement.notes,
      performedBy: movement.performedBy,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
    };
  }

  private serializeConsumption(
    consumption: MaterialConsumption,
    inventoryItemId?: number,
  ) {
    return {
      id: consumption.id,
      inventoryItemId: inventoryItemId ?? consumption.inventoryItem?.id ?? null,
      quantityUsed: consumption.quantityUsed,
      date: consumption.date,
      reference: consumption.reference,
      cost: consumption.cost,
      notes: consumption.notes,
      createdAt: consumption.createdAt,
      updatedAt: consumption.updatedAt,
    };
  }

  private serializeSupplierDetail(supplier: Supplier) {
    return {
      id: supplier.id,
      name: supplier.name,
      supplier: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city ?? null,
      status: supplier.status,
      statusCode: this.enumKey(SupplierStatus, supplier.status),
      totalPurchases: supplier.totalPurchases ?? 0,
      totalPaid: supplier.totalPaid ?? 0,
      totalDebt: supplier.totalDebt ?? 0,
      debt: supplier.totalDebt ?? 0,
      lastPurchaseDate: supplier.lastPurchaseDate ?? null,
      lastPurchase: supplier.lastPurchaseDate ?? null,
      notes: supplier.notes,
      archivedAt: supplier.archivedAt ?? null,
      count: '0',
      totalValue: String(Math.round(supplier.totalPurchases ?? 0)),
    };
  }

  private serializeSupplierSummaryRow(row: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    notes: string | null;
    count: string;
    totalValue: string;
  }) {
    return {
      id: Number(row.id),
      name: row.name,
      supplier: row.name,
      phone: row.phone,
      address: row.address,
      notes: row.notes,
      count: String(Number(row.count ?? 0)),
      totalValue: String(Math.round(Number(row.totalValue ?? 0))),
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

  private deriveStatus(quantity: number, minStockAlert: number) {
    if (quantity <= 0) {
      return StockStatus.OUT_OF_STOCK;
    }

    if (quantity <= minStockAlert) {
      return StockStatus.LOW_STOCK;
    }

    return StockStatus.AVAILABLE;
  }

  private calculateQuantityAfterMovement(
    type: MovementType,
    previousQuantity: number,
    quantity: number,
  ) {
    if (type === MovementType.IN) {
      return previousQuantity + quantity;
    }

    if (
      type === MovementType.OUT ||
      type === MovementType.LOSS ||
      type === MovementType.PRODUCTION
    ) {
      return previousQuantity - quantity;
    }

    return quantity;
  }

  private async resolveSupplierSelection(
    payload: {
      supplierId?: number;
      supplier?: string;
    },
    currentItem?: InventoryItem,
  ): Promise<SupplierSelection> {
    if (payload.supplierId !== undefined) {
      const supplierEntity = await this.findSupplierOrFail(payload.supplierId);
      return {
        supplier: supplierEntity.name,
        supplierEntity,
      };
    }

    if (payload.supplier !== undefined) {
      const supplierName = this.normalizeOptionalText(payload.supplier);
      if (!supplierName) {
        return {
          supplier: null,
          supplierEntity: null,
        };
      }

      const supplierEntity = await this.upsertSupplierByName({
        name: supplierName,
      });
      return {
        supplier: supplierEntity.name,
        supplierEntity,
      };
    }

    return {
      supplier: currentItem?.supplier ?? null,
      supplierEntity: currentItem?.supplierEntity ?? null,
    };
  }

  private async upsertSupplierByName(
    payload: CreateSupplierDto,
    manager?: EntityManager,
  ) {
    const repository = manager
      ? manager.getRepository(Supplier)
      : this.suppliersRepository;
    const name = this.normalizeRequiredText(payload.name, 'supplier name');
    const existing = await repository.findOne({
      where: { name },
    });

    if (existing) {
      if (payload.phone !== undefined) {
        existing.phone = this.normalizeOptionalText(payload.phone);
      }
      if (payload.address !== undefined) {
        existing.address = this.normalizeOptionalText(payload.address);
      }
      if (payload.city !== undefined) {
        existing.city = this.normalizeOptionalText(payload.city);
      }
      if (payload.status !== undefined) {
        existing.status = payload.status;
        existing.archivedAt =
          payload.status === SupplierStatus.ARCHIVED ? new Date() : null;
      }
      if (payload.notes !== undefined) {
        existing.notes = this.normalizeOptionalText(payload.notes);
      }
      return repository.save(existing);
    }

    return repository.save(
      repository.create({
        name,
        phone: this.normalizeOptionalText(payload.phone),
        address: this.normalizeOptionalText(payload.address),
        city: this.normalizeOptionalText(payload.city),
        status: payload.status ?? SupplierStatus.ACTIVE,
        notes: this.normalizeOptionalText(payload.notes),
        totalPurchases: 0,
        totalPaid: 0,
        totalDebt: 0,
        lastPurchaseDate: null,
        archivedAt: null,
      }),
    );
  }

  private async getSupplierSummaryById(id: number) {
    const row = await this.suppliersRepository
      .createQueryBuilder('supplier')
      .leftJoin('supplier.inventoryItems', 'item')
      .select('supplier.id', 'id')
      .addSelect('supplier.name', 'name')
      .addSelect('supplier.phone', 'phone')
      .addSelect('supplier.address', 'address')
      .addSelect('supplier.notes', 'notes')
      .addSelect('COUNT(item.id)', 'count')
      .addSelect(
        'COALESCE(SUM(item.quantity * item.unitPrice), 0)',
        'totalValue',
      )
      .where('supplier.id = :id', { id })
      .groupBy('supplier.id')
      .addGroupBy('supplier.name')
      .addGroupBy('supplier.phone')
      .addGroupBy('supplier.address')
      .addGroupBy('supplier.notes')
      .getRawOne<{
        id: string;
        name: string;
        phone: string | null;
        address: string | null;
        notes: string | null;
        count: string;
        totalValue: string;
      }>();

    return row ? this.serializeSupplierSummaryRow(row) : null;
  }

  private async findItemEntityOrFail(id: number) {
    const item = await this.itemsRepository.findOne({
      where: { id },
      relations: { supplierEntity: true },
    });

    if (!item) {
      throw new NotFoundException(
        `Inventory item with id ${id} was not found.`,
      );
    }

    return item;
  }

  private async findSupplierOrFail(id: number, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Supplier)
      : this.suppliersRepository;
    const supplier = await repository.findOne({ where: { id } });

    if (!supplier) {
      throw new NotFoundException(`Supplier with id ${id} was not found.`);
    }

    return supplier;
  }

  private normalizePage(value?: number) {
    const page = Number(value ?? DEFAULT_PAGE);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  }

  private normalizeLimit(value?: number) {
    const limit = Number(value ?? DEFAULT_LIMIT);
    if (!Number.isFinite(limit) || limit <= 0) {
      return DEFAULT_LIMIT;
    }

    return Math.min(Math.floor(limit), MAX_LIMIT);
  }

  private normalizeSortBy(sortBy?: string) {
    const allowed = new Set([
      'id',
      'name',
      'reference',
      'category',
      'quantity',
      'unit',
      'unitPrice',
      'supplier',
      'location',
      'status',
      'createdAt',
      'updatedAt',
    ]);

    return allowed.has(sortBy ?? '') ? sortBy! : 'name';
  }

  private resolveSortColumn(sortBy: string) {
    const map: Record<string, string> = {
      id: 'item.id',
      name: 'item.name',
      reference: 'item.reference',
      category: 'item.category',
      quantity: 'item.quantity',
      unit: 'item.unit',
      unitPrice: 'item.unitPrice',
      supplier: 'item.supplier',
      location: 'item.location',
      status: 'item.status',
      createdAt: 'item.createdAt',
      updatedAt: 'item.updatedAt',
    };

    return map[sortBy] ?? 'item.name';
  }

  private normalizeRequiredText(value: string, fieldName: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }
    return normalized;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundQuantity(value: number) {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }

  private enumKey<T extends Record<string, string>>(enumType: T, value: string) {
    return Object.entries(enumType).find(([, item]) => item === value)?.[0] ?? '';
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private normalizeDate(value?: string) {
    if (!value) {
      return this.toDateKey(new Date());
    }

    return value.slice(0, 10);
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private shiftDate(base: Date, days: number) {
    const next = new Date(base);
    next.setDate(next.getDate() + days);
    return next;
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

  private compareByDateDesc(
    leftDate: string,
    rightDate: string,
    leftCreatedAt?: Date,
    rightCreatedAt?: Date,
  ) {
    if (leftDate !== rightDate) {
      return leftDate < rightDate ? 1 : -1;
    }

    const leftTime = leftCreatedAt?.getTime() ?? 0;
    const rightTime = rightCreatedAt?.getTime() ?? 0;
    return rightTime - leftTime;
  }
}
