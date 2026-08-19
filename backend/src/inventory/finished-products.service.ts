import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  FinishedProductCategory,
  FinishedProductStatus,
  MovementType,
  ProductStockMovementType,
  StockStatus,
} from '../common/enums';
import { AdjustProductStockDto } from './dto/adjust-product-stock.dto';
import {
  CreateFinishedProductDto,
  CreateProductVariantDto,
} from './dto/create-finished-product.dto';
import { CreateProductionDto } from './dto/create-production.dto';
import { FinishedProductFilterDto } from './dto/finished-product-filter.dto';
import { UpdateFinishedProductDto } from './dto/update-finished-product.dto';
import { FinishedProduct } from './entities/finished-product.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { MaterialConsumption } from './entities/material-consumption.entity';
import { ProductStockMovement } from './entities/product-stock-movement.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductionBatch } from './entities/production-batch.entity';
import { ProductionMaterial } from './entities/production-material.entity';
import { StockMovement } from './entities/stock-movement.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type ResolvedMaterial = {
  item: InventoryItem;
  quantityUsed: number;
  totalCost: number;
};

@Injectable()
export class FinishedProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(FinishedProduct)
    private readonly productsRepository: Repository<FinishedProduct>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    @InjectRepository(ProductionBatch)
    private readonly productionsRepository: Repository<ProductionBatch>,
    @InjectRepository(ProductStockMovement)
    private readonly productMovementsRepository: Repository<ProductStockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seedFinishedProductsIfEmpty();
  }

  async create(dto: CreateFinishedProductDto) {
    const productId = await this.dataSource.transaction(async (manager) => {
      const sku = this.normalizeSku(dto.sku);
      await this.ensureProductSkuAvailable(manager, sku);

      const product = await manager.getRepository(FinishedProduct).save(
        manager.getRepository(FinishedProduct).create({
          name: this.requiredText(dto.name, 'name'),
          sku,
          category: dto.category,
          description: this.optionalText(dto.description),
          imageUrl: this.optionalText(dto.imageUrl),
          creationDate: dto.creationDate ?? this.toDateKey(new Date()),
          salePrice: this.roundMoney(dto.salePrice),
          estimatedProductionCost: this.roundMoney(
            dto.estimatedProductionCost ?? 0,
          ),
          minStockAlert: dto.minStockAlert ?? 0,
          status: dto.status ?? FinishedProductStatus.ACTIVE,
          notes: this.optionalText(dto.notes),
          quantityProduced: 0,
          quantityAvailable: 0,
          quantitySold: 0,
        }),
      );

      const variants = dto.variants?.length ? dto.variants : [{}];
      this.ensureDistinctVariantDefinitions(variants);

      for (const [index, variantDto] of variants.entries()) {
        const variantSku = this.buildVariantSku(
          sku,
          variantDto,
          index,
          variants.length,
        );
        await this.ensureVariantSkuAvailable(manager, variantSku);
        const initialQuantity = variantDto.initialQuantity ?? 0;
        const variant = await manager.getRepository(ProductVariant).save(
          manager.getRepository(ProductVariant).create({
            product,
            sku: variantSku,
            size: this.optionalText(variantDto.size),
            color: this.optionalText(variantDto.color),
            salePrice:
              variantDto.salePrice === undefined
                ? null
                : this.roundMoney(variantDto.salePrice),
            quantityProduced: initialQuantity,
            quantityAvailable: initialQuantity,
            quantitySold: 0,
            active: true,
          }),
        );

        if (initialQuantity > 0) {
          await manager.getRepository(ProductStockMovement).save(
            manager.getRepository(ProductStockMovement).create({
              product,
              variant,
              type: ProductStockMovementType.ADJUSTMENT,
              quantity: initialQuantity,
              previousQuantity: 0,
              newQuantity: initialQuantity,
              date: product.creationDate,
              reason: 'Initial stock',
            }),
          );
        }
      }

      await this.syncProductQuantities(manager, product.id);
      return product.id;
    });

    return this.findOne(productId);
  }

  async findAll(query: FinishedProductFilterDto = {}) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const sortBy = query.sortBy ?? 'name';
    const sortOrder = query.sortOrder ?? 'ASC';
    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(product.name LIKE :search OR product.sku LIKE :search OR product.description LIKE :search OR variant.sku LIKE :search OR variant.color LIKE :search OR variant.size LIKE :search)',
        { search },
      );
    }
    if (query.category) {
      qb.andWhere('product.category = :category', {
        category: query.category,
      });
    }
    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    }
    if (query.available === true) {
      qb.andWhere('product.quantityAvailable > 0').andWhere(
        'product.status = :activeStatus',
        { activeStatus: FinishedProductStatus.ACTIVE },
      );
    }
    if (query.available === false) {
      qb.andWhere('product.quantityAvailable <= 0');
    }

    qb.orderBy(`product.${sortBy}`, sortOrder)
      .addOrderBy('product.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await qb.getManyAndCount();
    return {
      data: products.map((product) => this.serializeProduct(product)),
      pagination: this.pagination(page, limit, total),
    };
  }

  async findOne(id: number) {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: {
        variants: true,
        productions: {
          variant: true,
          materials: { inventoryItem: true },
        },
        stockMovements: { variant: true },
      },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    product.variants.sort((left, right) => left.id - right.id);
    product.productions.sort((left, right) => {
      const byDate = right.date.localeCompare(left.date);
      return byDate || right.id - left.id;
    });
    product.stockMovements.sort((left, right) => {
      const byDate = right.date.localeCompare(left.date);
      return byDate || right.id - left.id;
    });

    return {
      ...this.serializeProduct(product),
      productions: product.productions.map((batch) =>
        this.serializeProduction(batch, product),
      ),
      movements: product.stockMovements.map((movement) =>
        this.serializeProductMovement(movement),
      ),
    };
  }

  async update(id: number, dto: UpdateFinishedProductDto) {
    await this.dataSource.transaction(async (manager) => {
      const product = await this.findProductOrFail(manager, id);

      if (dto.sku !== undefined) {
        const sku = this.normalizeSku(dto.sku);
        if (sku !== product.sku) {
          await this.ensureProductSkuAvailable(manager, sku, product.id);
          product.sku = sku;
        }
      }
      if (dto.name !== undefined)
        product.name = this.requiredText(dto.name, 'name');
      if (dto.category !== undefined) product.category = dto.category;
      if (dto.description !== undefined)
        product.description = this.optionalText(dto.description);
      if (dto.imageUrl !== undefined)
        product.imageUrl = this.optionalText(dto.imageUrl);
      if (dto.creationDate !== undefined)
        product.creationDate = dto.creationDate;
      if (dto.salePrice !== undefined)
        product.salePrice = this.roundMoney(dto.salePrice);
      if (dto.estimatedProductionCost !== undefined) {
        product.estimatedProductionCost = this.roundMoney(
          dto.estimatedProductionCost,
        );
      }
      if (dto.minStockAlert !== undefined)
        product.minStockAlert = dto.minStockAlert;
      if (dto.status !== undefined) product.status = dto.status;
      if (dto.notes !== undefined) product.notes = this.optionalText(dto.notes);
      await manager.getRepository(FinishedProduct).save(product);

      if (dto.variants !== undefined) {
        this.ensureDistinctVariantDefinitions(dto.variants);
        await this.upsertVariants(manager, product, dto.variants);
        await this.syncProductQuantities(manager, product.id);
      }
    });

    return this.findOne(id);
  }

  async archive(id: number) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    product.status = FinishedProductStatus.ARCHIVED;
    await this.productsRepository.save(product);
    return this.findOne(id);
  }

  async getStats() {
    const raw = await this.productsRepository
      .createQueryBuilder('product')
      .select('COUNT(product.id)', 'totalProducts')
      .addSelect(
        'COALESCE(SUM(product.quantityAvailable), 0)',
        'availablePieces',
      )
      .addSelect('COALESCE(SUM(product.quantitySold), 0)', 'soldPieces')
      .addSelect(
        'COALESCE(SUM(product.quantityAvailable * product.salePrice), 0)',
        'retailStockValue',
      )
      .addSelect(
        'COALESCE(SUM(product.quantityAvailable * product.estimatedProductionCost), 0)',
        'costStockValue',
      )
      .getRawOne<Record<string, number | string>>();

    const [activeProducts, lowStockProducts, productionBatches] =
      await Promise.all([
        this.productsRepository.count({
          where: { status: FinishedProductStatus.ACTIVE },
        }),
        this.productsRepository
          .createQueryBuilder('product')
          .where('product.status = :active', {
            active: FinishedProductStatus.ACTIVE,
          })
          .andWhere('product.quantityAvailable <= product.minStockAlert')
          .getCount(),
        this.productionsRepository.count(),
      ]);

    return {
      totalProducts: Number(raw?.totalProducts ?? 0),
      activeProducts,
      availablePieces: Number(raw?.availablePieces ?? 0),
      soldPieces: Number(raw?.soldPieces ?? 0),
      lowStockProducts,
      productionBatches,
      retailStockValue: this.roundMoney(Number(raw?.retailStockValue ?? 0)),
      costStockValue: this.roundMoney(Number(raw?.costStockValue ?? 0)),
    };
  }

  async createProduction(dto: CreateProductionDto) {
    const batchId = await this.dataSource.transaction(async (manager) => {
      const product = await this.findProductOrFail(manager, dto.productId);
      this.ensureProductIsActive(product);
      const variant = this.resolveVariant(product, dto.variantId);
      const date = dto.date ?? this.toDateKey(new Date());
      const batchNumber = await this.nextBatchNumber(manager);
      const resolvedMaterials = await this.resolveProductionMaterials(
        manager,
        dto,
      );

      const materialCost = this.roundMoney(
        resolvedMaterials.reduce((sum, item) => sum + item.totalCost, 0),
      );
      const additionalCost = this.roundMoney(dto.additionalCost ?? 0);
      const totalCost = this.roundMoney(materialCost + additionalCost);
      const unitCost = this.roundMoney(totalCost / dto.quantityProduced);

      const batch = await manager.getRepository(ProductionBatch).save(
        manager.getRepository(ProductionBatch).create({
          batchNumber,
          product,
          variant,
          quantityProduced: dto.quantityProduced,
          materialCost,
          additionalCost,
          totalCost,
          unitCost,
          date,
          notes: this.optionalText(dto.notes),
        }),
      );

      for (const resolved of resolvedMaterials) {
        await this.consumeRawMaterial(manager, batch, resolved, date);
      }

      const previousQuantity = variant.quantityAvailable;
      variant.quantityProduced += dto.quantityProduced;
      variant.quantityAvailable += dto.quantityProduced;
      await manager.getRepository(ProductVariant).save(variant);
      await manager.getRepository(ProductStockMovement).save(
        manager.getRepository(ProductStockMovement).create({
          product,
          variant,
          type: ProductStockMovementType.PRODUCTION,
          quantity: dto.quantityProduced,
          previousQuantity,
          newQuantity: variant.quantityAvailable,
          date,
          reference: batchNumber,
          reason: this.optionalText(dto.notes) ?? 'Production batch',
        }),
      );

      if (unitCost > 0) {
        product.estimatedProductionCost = unitCost;
        await manager.getRepository(FinishedProduct).save(product);
      }
      await this.syncProductQuantities(manager, product.id);
      return batch.id;
    });

    return this.findProduction(batchId);
  }

  async findProductions(productId?: number) {
    const productions = await this.productionsRepository.find({
      where: productId ? { product: { id: productId } } : {},
      relations: {
        product: true,
        variant: true,
        materials: { inventoryItem: true },
      },
      order: { date: 'DESC', id: 'DESC' },
      take: 200,
    });
    return { data: productions.map((item) => this.serializeProduction(item)) };
  }

  async adjustStock(id: number, dto: AdjustProductStockDto) {
    if (
      dto.type === ProductStockMovementType.PRODUCTION ||
      dto.type === ProductStockMovementType.SALE
    ) {
      throw new BadRequestException(
        'Production and sale movements must use their dedicated operations',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const product = await this.findProductOrFail(manager, id);
      this.ensureProductIsActive(product);
      const variant = this.resolveVariant(product, dto.variantId);
      const previousQuantity = variant.quantityAvailable;
      let newQuantity = previousQuantity;

      if (dto.type === ProductStockMovementType.ADJUSTMENT) {
        newQuantity = dto.quantity;
      } else if (dto.type === ProductStockMovementType.RETURN) {
        if (dto.quantity > variant.quantitySold) {
          throw new BadRequestException(
            `Return quantity exceeds sold quantity (${variant.quantitySold})`,
          );
        }
        newQuantity += dto.quantity;
        variant.quantitySold -= dto.quantity;
      } else if (dto.type === ProductStockMovementType.LOSS) {
        if (dto.quantity > previousQuantity) {
          throw new BadRequestException(
            `Loss quantity exceeds available stock (${previousQuantity})`,
          );
        }
        newQuantity -= dto.quantity;
      }

      variant.quantityAvailable = newQuantity;
      await manager.getRepository(ProductVariant).save(variant);
      await manager.getRepository(ProductStockMovement).save(
        manager.getRepository(ProductStockMovement).create({
          product,
          variant,
          type: dto.type,
          quantity: dto.quantity,
          previousQuantity,
          newQuantity,
          date: dto.date ?? this.toDateKey(new Date()),
          reference: this.optionalText(dto.reference),
          reason: this.optionalText(dto.reason),
        }),
      );
      await this.syncProductQuantities(manager, product.id);
    });

    return this.findOne(id);
  }

  private async upsertVariants(
    manager: EntityManager,
    product: FinishedProduct,
    variants: CreateProductVariantDto[],
  ) {
    const existing = await manager.getRepository(ProductVariant).find({
      where: { product: { id: product.id } },
    });

    for (const [index, dto] of variants.entries()) {
      const requestedSku = dto.sku
        ? this.normalizeSku(dto.sku)
        : this.buildVariantSku(product.sku, dto, index, variants.length);
      let variant = existing.find(
        (item) => item.sku.toUpperCase() === requestedSku.toUpperCase(),
      );

      if (!variant) {
        await this.ensureVariantSkuAvailable(manager, requestedSku);
        const initialQuantity = dto.initialQuantity ?? 0;
        variant = await manager.getRepository(ProductVariant).save(
          manager.getRepository(ProductVariant).create({
            product,
            sku: requestedSku,
            size: this.optionalText(dto.size),
            color: this.optionalText(dto.color),
            salePrice:
              dto.salePrice === undefined
                ? null
                : this.roundMoney(dto.salePrice),
            quantityProduced: initialQuantity,
            quantityAvailable: initialQuantity,
            quantitySold: 0,
            active: true,
          }),
        );
        if (initialQuantity > 0) {
          await manager.getRepository(ProductStockMovement).save(
            manager.getRepository(ProductStockMovement).create({
              product,
              variant,
              type: ProductStockMovementType.ADJUSTMENT,
              quantity: initialQuantity,
              previousQuantity: 0,
              newQuantity: initialQuantity,
              date: this.toDateKey(new Date()),
              reason: 'Initial variant stock',
            }),
          );
        }
        continue;
      }

      variant.size = this.optionalText(dto.size);
      variant.color = this.optionalText(dto.color);
      if (dto.salePrice !== undefined) {
        variant.salePrice = this.roundMoney(dto.salePrice);
      }
      variant.active = true;
      await manager.getRepository(ProductVariant).save(variant);
    }
  }

  private async resolveProductionMaterials(
    manager: EntityManager,
    dto: CreateProductionDto,
  ) {
    const materialDtos = dto.materials ?? [];
    const ids = materialDtos.map((item) => item.inventoryItemId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Each raw material can only appear once in a production batch',
      );
    }

    const resolved: ResolvedMaterial[] = [];
    for (const materialDto of materialDtos) {
      const item = await manager.getRepository(InventoryItem).findOne({
        where: { id: materialDto.inventoryItemId },
      });
      if (!item) {
        throw new NotFoundException(
          `Inventory item ${materialDto.inventoryItemId} not found`,
        );
      }
      if (materialDto.quantityUsed > item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.name}. Available: ${item.quantity} ${item.unit}`,
        );
      }
      resolved.push({
        item,
        quantityUsed: this.roundQuantity(materialDto.quantityUsed),
        totalCost: this.roundMoney(materialDto.quantityUsed * item.unitPrice),
      });
    }
    return resolved;
  }

  private async consumeRawMaterial(
    manager: EntityManager,
    batch: ProductionBatch,
    resolved: ResolvedMaterial,
    date: string,
  ) {
    const { item, quantityUsed, totalCost } = resolved;
    const previousQuantity = item.quantity;
    item.quantity = this.roundQuantity(item.quantity - quantityUsed);
    item.status = this.rawStockStatus(item.quantity, item.minStockAlert);
    await manager.getRepository(InventoryItem).save(item);

    await manager.getRepository(ProductionMaterial).save(
      manager.getRepository(ProductionMaterial).create({
        productionBatch: batch,
        inventoryItem: item,
        materialName: item.name,
        unit: item.unit,
        quantityUsed,
        unitCost: item.unitPrice,
        totalCost,
      }),
    );
    await manager.getRepository(StockMovement).save(
      manager.getRepository(StockMovement).create({
        inventoryItem: item,
        type: MovementType.PRODUCTION,
        quantity: quantityUsed,
        previousQuantity,
        newQuantity: item.quantity,
        unitSnapshot: item.unit,
        reason: 'Finished product production',
        reference: batch.batchNumber,
        date,
        notes: batch.notes,
      }),
    );
    await manager.getRepository(MaterialConsumption).save(
      manager.getRepository(MaterialConsumption).create({
        inventoryItem: item,
        productionBatch: batch,
        quantityUsed,
        date,
        reference: batch.batchNumber,
        cost: totalCost,
        notes: batch.notes,
      }),
    );
  }

  private async findProduction(id: number) {
    const batch = await this.productionsRepository.findOne({
      where: { id },
      relations: {
        product: true,
        variant: true,
        materials: { inventoryItem: true },
      },
    });
    if (!batch) throw new NotFoundException(`Production ${id} not found`);
    return this.serializeProduction(batch);
  }

  private async findProductOrFail(manager: EntityManager, id: number) {
    const product = await manager.getRepository(FinishedProduct).findOne({
      where: { id },
      relations: { variants: true },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  private resolveVariant(product: FinishedProduct, variantId?: number) {
    const variants = product.variants.filter((variant) => variant.active);
    if (variantId) {
      const variant = variants.find((item) => item.id === variantId);
      if (!variant) {
        throw new BadRequestException(
          `Variant ${variantId} does not belong to product ${product.id}`,
        );
      }
      return variant;
    }
    if (variants.length !== 1) {
      throw new BadRequestException(
        'variantId is required when a product has multiple active variants',
      );
    }
    return variants[0];
  }

  private async syncProductQuantities(
    manager: EntityManager,
    productId: number,
  ) {
    const product = await manager.getRepository(FinishedProduct).findOne({
      where: { id: productId },
    });
    if (!product) return;
    const totals = await manager
      .getRepository(ProductVariant)
      .createQueryBuilder('variant')
      .select('COALESCE(SUM(variant.quantityProduced), 0)', 'produced')
      .addSelect('COALESCE(SUM(variant.quantityAvailable), 0)', 'available')
      .addSelect('COALESCE(SUM(variant.quantitySold), 0)', 'sold')
      .where('variant.productId = :productId', { productId })
      .getRawOne<Record<string, number | string>>();
    product.quantityProduced = Number(totals?.produced ?? 0);
    product.quantityAvailable = Number(totals?.available ?? 0);
    product.quantitySold = Number(totals?.sold ?? 0);
    await manager.getRepository(FinishedProduct).save(product);
  }

  private serializeProduct(product: FinishedProduct) {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      reference: product.sku,
      category: product.category,
      categoryCode: this.enumKey(FinishedProductCategory, product.category),
      description: product.description ?? null,
      imageUrl: product.imageUrl ?? null,
      creationDate: product.creationDate,
      salePrice: product.salePrice,
      estimatedProductionCost: product.estimatedProductionCost,
      quantityProduced: product.quantityProduced,
      quantityAvailable: product.quantityAvailable,
      quantitySold: product.quantitySold,
      minStockAlert: product.minStockAlert,
      status: product.status,
      statusCode: this.enumKey(FinishedProductStatus, product.status),
      availability:
        product.quantityAvailable <= 0
          ? 'OUT_OF_STOCK'
          : product.quantityAvailable <= product.minStockAlert
            ? 'LOW_STOCK'
            : 'AVAILABLE',
      notes: product.notes ?? null,
      variants: (product.variants ?? [])
        .sort((left, right) => left.id - right.id)
        .map((variant) => this.serializeVariant(variant, product.salePrice)),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private serializeVariant(variant: ProductVariant, productPrice: number) {
    return {
      id: variant.id,
      sku: variant.sku,
      size: variant.size ?? null,
      color: variant.color ?? null,
      label: this.variantLabel(variant),
      quantityProduced: variant.quantityProduced,
      quantityAvailable: variant.quantityAvailable,
      quantitySold: variant.quantitySold,
      salePrice: variant.salePrice ?? productPrice,
      active: variant.active,
    };
  }

  private serializeProduction(
    batch: ProductionBatch,
    loadedProduct?: FinishedProduct,
  ) {
    const product = batch.product ?? loadedProduct;
    if (!product) {
      throw new Error(`Production ${batch.id} was loaded without its product`);
    }

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      variantId: batch.variant?.id ?? null,
      variant: batch.variant ? this.variantLabel(batch.variant) : null,
      quantityProduced: batch.quantityProduced,
      materialCost: batch.materialCost,
      additionalCost: batch.additionalCost,
      totalCost: batch.totalCost,
      unitCost: batch.unitCost,
      date: batch.date,
      notes: batch.notes ?? null,
      materials: (batch.materials ?? []).map((material) => ({
        id: material.id,
        inventoryItemId: material.inventoryItem?.id ?? null,
        name: material.materialName,
        unit: material.unit,
        quantityUsed: material.quantityUsed,
        unitCost: material.unitCost,
        totalCost: material.totalCost,
      })),
      createdAt: batch.createdAt,
    };
  }

  private serializeProductMovement(movement: ProductStockMovement) {
    return {
      id: movement.id,
      type: movement.type,
      typeCode: this.enumKey(ProductStockMovementType, movement.type),
      variantId: movement.variant?.id ?? null,
      variant: movement.variant ? this.variantLabel(movement.variant) : null,
      quantity: movement.quantity,
      previousQuantity: movement.previousQuantity,
      newQuantity: movement.newQuantity,
      date: movement.date,
      reference: movement.reference ?? null,
      reason: movement.reason ?? null,
      createdAt: movement.createdAt,
    };
  }

  private ensureProductIsActive(product: FinishedProduct) {
    if (product.status !== FinishedProductStatus.ACTIVE) {
      throw new BadRequestException('Only active products can receive stock');
    }
  }

  private ensureDistinctVariantDefinitions(
    variants: CreateProductVariantDto[],
  ) {
    const keys = variants.map(
      (variant) =>
        `${variant.size?.trim().toLowerCase() ?? ''}|${variant.color?.trim().toLowerCase() ?? ''}`,
    );
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException(
        'Product variants must have unique size and color combinations',
      );
    }
  }

  private async ensureProductSkuAvailable(
    manager: EntityManager,
    sku: string,
    ignoredId?: number,
  ) {
    const existing = await manager.getRepository(FinishedProduct).findOne({
      where: { sku },
    });
    if (existing && existing.id !== ignoredId) {
      throw new ConflictException(`Product SKU ${sku} already exists`);
    }
  }

  private async ensureVariantSkuAvailable(
    manager: EntityManager,
    sku: string,
    ignoredId?: number,
  ) {
    const existing = await manager.getRepository(ProductVariant).findOne({
      where: { sku },
    });
    if (existing && existing.id !== ignoredId) {
      throw new ConflictException(`Variant SKU ${sku} already exists`);
    }
  }

  private buildVariantSku(
    productSku: string,
    variant: CreateProductVariantDto,
    index: number,
    total: number,
  ) {
    if (variant.sku) return this.normalizeSku(variant.sku);
    if (total === 1 && !variant.size && !variant.color) return productSku;
    const size = variant.size || 'STD';
    const color = variant.color || String(index + 1);
    return this.normalizeSku(`${productSku}-${size}-${color}`);
  }

  private normalizeSku(value: string) {
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\u0600-\u06ff]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!normalized) throw new BadRequestException('sku is required');
    return normalized;
  }

  private variantLabel(variant: ProductVariant) {
    return (
      [variant.size, variant.color].filter(Boolean).join(' / ') || 'Standard'
    );
  }

  private async nextBatchNumber(manager: EntityManager) {
    const last = await manager.getRepository(ProductionBatch).findOne({
      where: {},
      select: { batchNumber: true },
      order: { id: 'DESC' },
    });
    const next = Number(last?.batchNumber.match(/(\d+)$/)?.[1] ?? 0) + 1;
    return `PROD-${this.toDateKey(new Date()).replace(/-/g, '')}-${String(next).padStart(4, '0')}`;
  }

  private async seedFinishedProductsIfEmpty() {
    if ((await this.productsRepository.count()) > 0) return;

    const robe = await this.create({
      name: '\u0645\u0648\u062f\u064a\u0644 \u0631\u0648\u0628 A15',
      sku: 'ROB-A15',
      category: FinishedProductCategory.DRESS,
      description:
        '\u0631\u0648\u0628 \u064a\u0648\u0645\u064a \u0628\u0642\u0635\u0629 \u0639\u0635\u0631\u064a\u0629',
      salePrice: 4200,
      minStockAlert: 8,
      variants: [
        { size: 'M', color: '\u0623\u0633\u0648\u062f' },
        { size: 'L', color: '\u0623\u0633\u0648\u062f' },
        { size: 'L', color: '\u0623\u0632\u0631\u0642' },
      ],
    });
    const shirt = await this.create({
      name: '\u0642\u0645\u064a\u0635 \u0643\u0644\u0627\u0633\u064a\u0643\u064a',
      sku: 'CHM-CLS',
      category: FinishedProductCategory.SHIRT,
      salePrice: 2800,
      minStockAlert: 10,
      variants: [
        { size: 'M', color: '\u0623\u0628\u064a\u0636' },
        { size: 'L', color: '\u0623\u0628\u064a\u0636' },
      ],
    });

    const robeVariants = robe.variants as Array<{ id: number }>;
    for (const [index, variant] of robeVariants.entries()) {
      await this.createProduction({
        productId: robe.id,
        variantId: variant.id,
        quantityProduced: index === 0 ? 18 : 12,
        additionalCost: index === 0 ? 14400 : 9600,
        notes:
          '\u062f\u0641\u0639\u0629 \u0625\u0646\u062a\u0627\u062c \u0627\u0641\u062a\u062a\u0627\u062d\u064a\u0629',
      });
    }
    const shirtVariants = shirt.variants as Array<{ id: number }>;
    for (const variant of shirtVariants) {
      await this.createProduction({
        productId: shirt.id,
        variantId: variant.id,
        quantityProduced: 20,
        additionalCost: 12000,
        notes:
          '\u062f\u0641\u0639\u0629 \u0625\u0646\u062a\u0627\u062c \u0627\u0641\u062a\u062a\u0627\u062d\u064a\u0629',
      });
    }
  }

  private rawStockStatus(quantity: number, minimum: number) {
    if (quantity <= 0) return StockStatus.OUT_OF_STOCK;
    if (quantity <= minimum) return StockStatus.LOW_STOCK;
    return StockStatus.AVAILABLE;
  }

  private enumKey<T extends Record<string, string>>(
    enumType: T,
    value: string,
  ) {
    return (
      Object.entries(enumType).find(([, item]) => item === value)?.[0] ?? ''
    );
  }

  private requiredText(value: string, field: string) {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`${field} is required`);
    return normalized;
  }

  private optionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private normalizePage(value?: number) {
    return Math.max(DEFAULT_PAGE, Math.floor(value ?? DEFAULT_PAGE));
  }

  private normalizeLimit(value?: number) {
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(value ?? DEFAULT_LIMIT)));
  }

  private pagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundQuantity(value: number) {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
