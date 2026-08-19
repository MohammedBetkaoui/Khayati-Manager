import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { InventoryCategory, MovementType, StockStatus } from '../common/enums';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { InventoryFilterDto } from './dto/inventory-filter.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryItem } from './entities/inventory-item.entity';
import { MaterialConsumption } from './entities/material-consumption.entity';
import { StockMovement } from './entities/stock-movement.entity';
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
    @InjectRepository(MaterialConsumption)
    private readonly consumptionsRepository: Repository<MaterialConsumption>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seedInventoryIfEmpty();
    await this.syncExistingInventoryState();
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
    const [totalMaterials, lowStockMaterials, stockValue, monthlyMovements] =
      await Promise.all([
        this.itemsRepository.count(),
        this.itemsRepository
          .createQueryBuilder('item')
          .where('item.quantity <= item.minStockAlert')
          .getCount(),
        this.calculateStockValue(),
        this.movementsRepository
          .createQueryBuilder('movement')
          .where('movement.date BETWEEN :start AND :end', { start, end })
          .getCount(),
      ]);

    return {
      totalMaterials,
      totalItems: totalMaterials,
      lowStockMaterials,
      lowStock: lowStockMaterials,
      stockValue: stockValue.totalValue,
      monthlyMovements,
      movementsCount: monthlyMovements,
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

  async getSuppliers() {
    const rows = await this.suppliersRepository
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
      .groupBy('supplier.id')
      .addGroupBy('supplier.name')
      .addGroupBy('supplier.phone')
      .addGroupBy('supplier.address')
      .addGroupBy('supplier.notes')
      .orderBy('supplier.name', 'ASC')
      .getRawMany<{
        id: string;
        name: string;
        phone: string | null;
        address: string | null;
        notes: string | null;
        count: string;
        totalValue: string;
      }>();

    return rows.map((row) => this.serializeSupplierSummaryRow(row));
  }

  async createSupplier(dto: CreateSupplierDto) {
    const supplier = await this.upsertSupplierByName({
      name: dto.name,
      phone: dto.phone,
      address: dto.address,
      notes: dto.notes,
    });

    const summary = await this.getSupplierSummaryById(supplier.id);
    return summary ?? this.serializeSupplierDetail(supplier);
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
      notes: supplier.notes,
      count: '0',
      totalValue: '0',
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

  private async upsertSupplierByName(payload: CreateSupplierDto) {
    const name = this.normalizeRequiredText(payload.name, 'supplier name');
    const existing = await this.suppliersRepository.findOne({
      where: { name },
    });

    if (existing) {
      if (payload.phone !== undefined) {
        existing.phone = this.normalizeOptionalText(payload.phone);
      }
      if (payload.address !== undefined) {
        existing.address = this.normalizeOptionalText(payload.address);
      }
      if (payload.notes !== undefined) {
        existing.notes = this.normalizeOptionalText(payload.notes);
      }
      return this.suppliersRepository.save(existing);
    }

    return this.suppliersRepository.save(
      this.suppliersRepository.create({
        name,
        phone: this.normalizeOptionalText(payload.phone),
        address: this.normalizeOptionalText(payload.address),
        notes: this.normalizeOptionalText(payload.notes),
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

  private async findSupplierOrFail(id: number) {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });

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
