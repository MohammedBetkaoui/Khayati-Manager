import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockStatus } from '../common/enums';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryItem } from './entities/inventory-item.entity';
import { StockMovement } from './entities/stock-movement.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemsRepo: Repository<InventoryItem>,
    @InjectRepository(StockMovement)
    private readonly movementsRepo: Repository<StockMovement>,
  ) {}

  private deriveStatus(quantity: number, minStockAlert: number, status?: StockStatus) {
    if (status) return status;
    if (quantity <= 0) return StockStatus.OUT_OF_STOCK;
    if (quantity <= minStockAlert) return StockStatus.LOW;
    return StockStatus.AVAILABLE;
  }

  async create(dto: CreateInventoryDto) {
    const quantity = dto.quantity ?? 0;
    const minStockAlert = dto.minStockAlert ?? 0;

    const item = this.itemsRepo.create({
      ...dto,
      quantity,
      unitPrice: dto.unitPrice ?? 0,
      minStockAlert,
      status: this.deriveStatus(quantity, minStockAlert, dto.status),
    });
    return this.itemsRepo.save(item);
  }

  async findAll(query: {
    search?: string;
    category?: string;
    status?: string;
    supplier?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 100));

    const qb = this.itemsRepo.createQueryBuilder('item');

    if (query.search?.trim()) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(item.name LIKE :s OR item.supplier LIKE :s)', { s });
    }
    if (query.category) {
      qb.andWhere('item.category = :category', { category: query.category });
    }
    if (query.status) {
      qb.andWhere('item.status = :status', { status: query.status });
    }
    if (query.supplier) {
      qb.andWhere('item.supplier = :supplier', { supplier: query.supplier });
    }

    qb.orderBy('item.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getStats() {
    const [totalItems, lowStock, outOfStock, valueRow, movementsCount] =
      await Promise.all([
        this.itemsRepo.count(),
        this.itemsRepo.count({ where: { status: StockStatus.LOW } }),
        this.itemsRepo.count({ where: { status: StockStatus.OUT_OF_STOCK } }),
        this.itemsRepo
          .createQueryBuilder('item')
          .select('SUM(item.quantity * item.unitPrice)', 'total')
          .getRawOne<{ total: string | null }>(),
        this.movementsRepo.count(),
      ]);

    return {
      totalItems,
      lowStock: lowStock + outOfStock,
      stockValue: Math.round(Number(valueRow?.total ?? 0)),
      movementsCount,
    };
  }

  async getMovements(query: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));

    const [movements, total] = await this.movementsRepo.findAndCount({
      relations: { inventoryItem: true },
      order: { date: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: movements,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getSuppliers() {
    const rows = await this.itemsRepo
      .createQueryBuilder('item')
      .select('item.supplier', 'supplier')
      .addSelect('COUNT(item.id)', 'count')
      .addSelect('SUM(item.quantity * item.unitPrice)', 'totalValue')
      .where('item.supplier IS NOT NULL AND item.supplier != \'\'  ')
      .groupBy('item.supplier')
      .orderBy('supplier', 'ASC')
      .getRawMany<{ supplier: string; count: string; totalValue: string }>();
    return rows;
  }

  async findOne(id: number) {
    const item = await this.itemsRepo.findOne({
      where: { id },
      relations: { stockMovements: true },
    });
    if (!item) throw new NotFoundException(`Inventory item #${id} not found`);
    return item;
  }

  async update(id: number, dto: UpdateInventoryDto) {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    item.status = this.deriveStatus(item.quantity, item.minStockAlert, dto.status);
    return this.itemsRepo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.itemsRepo.remove(item);
    return { deleted: id };
  }
}
