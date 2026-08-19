import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  InventoryCategory,
  MovementType,
  OrderPriority,
  OrderStatus,
  SalaryType,
  StockStatus,
  WorkerRole,
  WorkerStatus,
} from '../common/enums';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { MaterialConsumption } from '../inventory/entities/material-consumption.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { CustomerNote } from '../sales/entities/customer-note.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Worker } from '../workers/entities/worker.entity';
import { AddMaterialDto } from './dto/add-material.dto';
import { AssignWorkerDto } from './dto/assign-worker.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderMaterial } from './entities/order-material.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { OrderWorker } from './entities/order-worker.entity';
import { Order } from './entities/order.entity';

type PaginationPayload = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ProductionCosts = {
  materialCost: number;
  laborCost: number;
  totalCost: number;
  salePrice: number;
  profit: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const STATUS_FLOW = [
  OrderStatus.NEW,
  OrderStatus.CUTTING,
  OrderStatus.SEWING,
  OrderStatus.IRONING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
] as const;

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderWorker)
    private readonly orderWorkersRepository: Repository<OrderWorker>,
    @InjectRepository(OrderMaterial)
    private readonly orderMaterialsRepository: Repository<OrderMaterial>,
    @InjectRepository(OrderStatusHistory)
    private readonly statusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Worker)
    private readonly workersRepository: Repository<Worker>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepository: Repository<InventoryItem>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seedOrdersIfEmpty();
  }

  async create(dto: CreateOrderDto) {
    const orderId = await this.dataSource.transaction(async (manager) => {
      const customer = await this.findCustomerOrFail(dto.customerId, manager);
      const receivedDate = dto.receivedDate ?? this.toDateKey(new Date());
      this.validateDates(receivedDate, dto.deliveryDate);

      const repository = manager.getRepository(Order);
      const order = await repository.save(
        repository.create({
          orderNumber: await this.nextOrderNumber(manager),
          customer,
          customerName: customer.fullName,
          customerPhone: customer.phone,
          productType: dto.productType.trim(),
          quantity: dto.quantity,
          colors: this.normalizeOptionalText(dto.colors),
          sizes: this.normalizeOptionalText(dto.sizes),
          status: OrderStatus.NEW,
          priority: dto.priority ?? OrderPriority.NORMAL,
          receivedDate,
          deliveryDate: dto.deliveryDate,
          estimatedCost: 0,
          finalPrice: this.roundMoney(dto.finalPrice ?? 0),
          notes: this.normalizeOptionalText(dto.notes),
        }),
      );

      await manager.getRepository(OrderStatusHistory).save(
        manager.getRepository(OrderStatusHistory).create({
          order,
          status: OrderStatus.NEW,
          date: receivedDate,
          comment: 'Order created',
        }),
      );

      return order.id;
    });

    return this.findOne(orderId);
  }

  async findAll(query: OrderFilterDto = {}) {
    const page = this.normalizePage(query.page);
    const limit = this.normalizeLimit(query.limit);
    const sortBy = query.sortBy ?? 'deliveryDate';
    const sortOrder = query.sortOrder ?? 'ASC';
    const qb = this.ordersRepository
      .createQueryBuilder('workOrder')
      .leftJoinAndSelect('workOrder.customer', 'customer')
      .leftJoinAndSelect('workOrder.workers', 'assignment')
      .leftJoinAndSelect('assignment.worker', 'worker');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(workOrder.orderNumber LIKE :search OR customer.fullName LIKE :search OR workOrder.customerName LIKE :search OR workOrder.productType LIKE :search)',
        { search },
      );
    }

    if (query.status) {
      qb.andWhere('workOrder.status = :status', { status: query.status });
    }
    if (query.priority) {
      qb.andWhere('workOrder.priority = :priority', {
        priority: query.priority,
      });
    }
    if (query.deliveryDate) {
      qb.andWhere('workOrder.deliveryDate = :deliveryDate', {
        deliveryDate: query.deliveryDate,
      });
    }

    qb.orderBy(`workOrder.${sortBy}`, sortOrder)
      .addOrderBy('workOrder.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await qb.getManyAndCount();
    return this.buildListResponse(
      orders.map((order) => this.serializeOrder(order)),
      this.buildPagination(page, limit, total),
    );
  }

  async findOne(id: number) {
    return this.serializeOrder(await this.findOrderOrFail(id));
  }

  async getDetails(id: number) {
    const order = await this.findOrderOrFail(id);
    return this.serializeDetails(order);
  }

  async update(id: number, dto: UpdateOrderDto) {
    await this.dataSource.transaction(async (manager) => {
      const order = await this.findOrderOrFail(id, manager);

      if (
        dto.customerId !== undefined &&
        dto.customerId !== order.customer?.id
      ) {
        const customer = await this.findCustomerOrFail(dto.customerId, manager);
        order.customer = customer;
        order.customerName = customer.fullName;
        order.customerPhone = customer.phone;
      }
      if (dto.productType !== undefined) {
        order.productType = dto.productType.trim();
      }
      if (dto.quantity !== undefined) order.quantity = dto.quantity;
      if (dto.colors !== undefined) {
        order.colors = this.normalizeOptionalText(dto.colors);
      }
      if (dto.sizes !== undefined) {
        order.sizes = this.normalizeOptionalText(dto.sizes);
      }
      if (dto.receivedDate !== undefined) {
        order.receivedDate = dto.receivedDate;
      }
      if (dto.deliveryDate !== undefined) {
        order.deliveryDate = dto.deliveryDate;
      }
      if (dto.priority !== undefined) order.priority = dto.priority;
      if (dto.finalPrice !== undefined) {
        order.finalPrice = this.roundMoney(dto.finalPrice);
      }
      if (dto.notes !== undefined) {
        order.notes = this.normalizeOptionalText(dto.notes);
      }

      this.validateDates(order.receivedDate, order.deliveryDate);
      await manager.getRepository(Order).save(order);
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.dataSource.transaction(async (manager) => {
      const order = await this.findOrderOrFail(id, manager);
      if (order.status === OrderStatus.DELIVERED) {
        throw new BadRequestException(
          'Delivered orders cannot be deleted because they belong to customer history',
        );
      }

      for (const material of order.materials) {
        if (!material.inventoryItem) continue;
        const item = material.inventoryItem;
        const previousQuantity = item.quantity;
        item.quantity = this.roundQuantity(
          item.quantity + material.quantityUsed,
        );
        item.status = this.deriveStockStatus(item.quantity, item.minStockAlert);
        await manager.getRepository(InventoryItem).save(item);
        await manager.getRepository(StockMovement).save(
          manager.getRepository(StockMovement).create({
            inventoryItem: item,
            type: MovementType.IN,
            quantity: material.quantityUsed,
            previousQuantity,
            newQuantity: item.quantity,
            unitSnapshot: item.unit,
            reason: 'Order deletion stock restoration',
            reference: order.orderNumber,
            date: this.toDateKey(new Date()),
            notes: `Restored after deleting ${order.orderNumber}`,
          }),
        );
      }

      await manager
        .getRepository(MaterialConsumption)
        .createQueryBuilder()
        .delete()
        .where('orderId = :orderId', { orderId: String(order.id) })
        .execute();
      await manager.getRepository(Order).remove(order);
    });

    return { deleted: true, id };
  }

  async getDashboardStats() {
    const today = this.toDateKey(new Date());
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = this.toDateKey(
      new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0),
    );

    const [newOrders, inProduction, ready, late, monthlyCostRaw] =
      await Promise.all([
        this.ordersRepository.count({ where: { status: OrderStatus.NEW } }),
        this.ordersRepository.count({
          where: {
            status: In([
              OrderStatus.CUTTING,
              OrderStatus.SEWING,
              OrderStatus.IRONING,
            ]),
          },
        }),
        this.ordersRepository.count({ where: { status: OrderStatus.READY } }),
        this.ordersRepository
          .createQueryBuilder('workOrder')
          .where('workOrder.deliveryDate < :today', { today })
          .andWhere('workOrder.status != :delivered', {
            delivered: OrderStatus.DELIVERED,
          })
          .getCount(),
        this.ordersRepository
          .createQueryBuilder('workOrder')
          .select('COALESCE(SUM(workOrder.estimatedCost), 0)', 'total')
          .where('workOrder.receivedDate BETWEEN :start AND :end', {
            start: monthStart,
            end: monthEnd,
          })
          .getRawOne<{ total: number | string }>(),
      ]);

    return {
      newOrders,
      inProduction,
      ready,
      late,
      monthlyCost: this.roundMoney(Number(monthlyCostRaw?.total ?? 0)),
    };
  }

  async getDelayedOrders() {
    const today = this.toDateKey(new Date());
    const orders = await this.ordersRepository
      .createQueryBuilder('workOrder')
      .leftJoinAndSelect('workOrder.customer', 'customer')
      .leftJoinAndSelect('workOrder.workers', 'assignment')
      .leftJoinAndSelect('assignment.worker', 'worker')
      .where('workOrder.deliveryDate < :today', { today })
      .andWhere('workOrder.status != :delivered', {
        delivered: OrderStatus.DELIVERED,
      })
      .orderBy('workOrder.deliveryDate', 'ASC')
      .getMany();

    return { data: orders.map((order) => this.serializeOrder(order)) };
  }

  async changeStatus(id: number, dto: ChangeOrderStatusDto) {
    await this.dataSource.transaction(async (manager) => {
      const order = await this.findOrderOrFail(id, manager);
      const previousStatus = order.status;
      const date = dto.date ?? this.toDateKey(new Date());
      let responsible: Worker | undefined;

      if (dto.workerId) {
        responsible = await this.findWorkerOrFail(dto.workerId, manager);
      } else {
        responsible = order.workers.find(
          (assignment) => assignment.stage === dto.status,
        )?.worker;
      }

      order.status = dto.status;
      await manager.getRepository(Order).save(order);
      await manager.getRepository(OrderStatusHistory).save(
        manager.getRepository(OrderStatusHistory).create({
          order,
          status: dto.status,
          date,
          responsible,
          responsibleName: responsible?.fullName,
          comment: this.normalizeOptionalText(dto.comment),
        }),
      );

      if (
        dto.status === OrderStatus.DELIVERED &&
        previousStatus !== OrderStatus.DELIVERED &&
        order.customer
      ) {
        order.customer.lastVisitDate = date;
        await manager.getRepository(Customer).save(order.customer);
        await manager.getRepository(CustomerNote).save(
          manager.getRepository(CustomerNote).create({
            customer: order.customer,
            content: `\u062a\u0645 \u062a\u0633\u0644\u064a\u0645 \u0627\u0644\u0637\u0644\u0628\u064a\u0629 ${order.orderNumber}`,
            date,
          }),
        );
      }
    });

    return this.getDetails(id);
  }

  async assignWorker(id: number, dto: AssignWorkerDto) {
    await this.dataSource.transaction(async (manager) => {
      const order = await this.findOrderOrFail(id, manager);
      const worker = await this.findWorkerOrFail(dto.workerId, manager);
      const repository = manager.getRepository(OrderWorker);
      let assignment = await repository.findOne({
        where: {
          order: { id: order.id },
          worker: { id: worker.id },
          stage: dto.stage,
        },
      });

      if (!assignment) {
        assignment = repository.create({ order, worker, stage: dto.stage });
      }
      assignment.assignedDate =
        dto.assignedDate ??
        assignment.assignedDate ??
        this.toDateKey(new Date());
      assignment.completedPieces =
        dto.completedPieces ?? assignment.completedPieces ?? 0;
      if (dto.notes !== undefined) {
        assignment.notes = this.normalizeOptionalText(dto.notes);
      }

      await repository.save(assignment);
      await this.recalculateProductionCost(manager, order.id);
    });

    return this.getDetails(id);
  }

  async addMaterial(id: number, dto: AddMaterialDto) {
    await this.dataSource.transaction(async (manager) => {
      const order = await this.findOrderOrFail(id, manager);
      const item = await this.findInventoryItemOrFail(
        dto.inventoryItemId,
        manager,
      );
      await this.consumeMaterial(manager, order, item, dto);
      await this.recalculateProductionCost(manager, order.id);
    });

    return this.getDetails(id);
  }

  async calculateProductionCost(id: number) {
    const costs = await this.dataSource.transaction((manager) =>
      this.recalculateProductionCost(manager, id),
    );
    return costs;
  }

  private async consumeMaterial(
    manager: EntityManager,
    order: Order,
    item: InventoryItem,
    dto: AddMaterialDto,
  ) {
    const quantityUsed = this.roundQuantity(dto.quantityUsed);
    if (quantityUsed > item.quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${item.name}. Available: ${item.quantity} ${item.unit}`,
      );
    }

    const previousQuantity = item.quantity;
    item.quantity = this.roundQuantity(item.quantity - quantityUsed);
    item.status = this.deriveStockStatus(item.quantity, item.minStockAlert);
    await manager.getRepository(InventoryItem).save(item);

    const totalCost = this.roundMoney(quantityUsed * item.unitPrice);
    await manager.getRepository(OrderMaterial).save(
      manager.getRepository(OrderMaterial).create({
        order,
        inventoryItem: item,
        materialName: item.name,
        quantityUsed,
        unit: item.unit,
        unitCost: item.unitPrice,
        totalCost,
        notes: this.normalizeOptionalText(dto.notes),
      }),
    );

    const date = this.toDateKey(new Date());
    await manager.getRepository(StockMovement).save(
      manager.getRepository(StockMovement).create({
        inventoryItem: item,
        type: MovementType.OUT,
        quantity: quantityUsed,
        previousQuantity,
        newQuantity: item.quantity,
        unitSnapshot: item.unit,
        reason: 'Production order consumption',
        reference: order.orderNumber,
        date,
        notes: this.normalizeOptionalText(dto.notes),
      }),
    );
    await manager.getRepository(MaterialConsumption).save(
      manager.getRepository(MaterialConsumption).create({
        inventoryItem: item,
        quantityUsed,
        date,
        orderId: String(order.id),
        cost: totalCost,
        notes: this.normalizeOptionalText(dto.notes),
      }),
    );
  }

  private async recalculateProductionCost(
    manager: EntityManager,
    orderId: number,
  ): Promise<ProductionCosts> {
    const order = await manager.getRepository(Order).findOne({
      where: { id: orderId },
      relations: {
        materials: true,
        workers: { worker: true },
      },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const materialCost = this.roundMoney(
      order.materials.reduce((sum, material) => sum + material.totalCost, 0),
    );
    const laborCost = this.roundMoney(
      order.workers.reduce(
        (sum, assignment) => sum + this.calculateAssignmentCost(assignment),
        0,
      ),
    );
    const totalCost = this.roundMoney(materialCost + laborCost);
    const salePrice = this.roundMoney(order.finalPrice);
    const profit = this.roundMoney(salePrice - totalCost);
    order.estimatedCost = totalCost;
    await manager.getRepository(Order).save(order);

    return { materialCost, laborCost, totalCost, salePrice, profit };
  }

  private calculateAssignmentCost(assignment: OrderWorker) {
    const value = assignment.worker.salaryValue ?? 0;
    if (assignment.worker.salaryType === SalaryType.PIECE) {
      return this.roundMoney(assignment.completedPieces * value);
    }
    if (assignment.worker.salaryType === SalaryType.MIXED) {
      return this.roundMoney(assignment.completedPieces * value);
    }
    if (assignment.worker.salaryType === SalaryType.WEEKLY) {
      return this.roundMoney(value / 6);
    }
    if (assignment.worker.salaryType === SalaryType.MONTHLY) {
      return this.roundMoney(value / 26);
    }
    return this.roundMoney(value);
  }

  private async findOrderOrFail(id: number, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(Order)
      : this.ordersRepository;
    const order = await repository.findOne({
      where: { id },
      relations: {
        customer: true,
        workers: { worker: true },
        materials: { inventoryItem: true },
        statusHistory: { responsible: true },
      },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  private async findCustomerOrFail(id: number, manager: EntityManager) {
    const customer = await manager.getRepository(Customer).findOne({
      where: { id },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  private async findWorkerOrFail(id: number, manager: EntityManager) {
    const worker = await manager.getRepository(Worker).findOne({
      where: { id },
    });
    if (!worker) throw new NotFoundException(`Worker ${id} not found`);
    return worker;
  }

  private async findInventoryItemOrFail(id: number, manager: EntityManager) {
    const item = await manager.getRepository(InventoryItem).findOne({
      where: { id },
    });
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return item;
  }

  private async nextOrderNumber(manager: EntityManager) {
    const last = await manager.getRepository(Order).findOne({
      where: {},
      select: { orderNumber: true },
      order: { id: 'DESC' },
    });
    const match = last?.orderNumber.match(/(\d+)$/);
    const next = Math.max(1024, Number(match?.[1] ?? 1023) + 1);
    return `#ORD-${next}`;
  }

  private serializeOrder(order: Order) {
    const responsible = this.getResponsibleAssignment(order);
    const customerName = order.customer?.fullName ?? order.customerName ?? '-';
    const customerPhone = order.customer?.phone ?? order.customerPhone ?? '';
    const statusCode = this.enumKey(OrderStatus, order.status);
    const priorityCode = this.enumKey(OrderPriority, order.priority);
    const delayed = this.isDelayed(order);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      number: order.orderNumber,
      customerId: order.customer?.id ?? null,
      customer: customerName,
      customerName,
      customerPhone,
      phone: customerPhone,
      product: order.productType,
      productType: order.productType,
      quantity: order.quantity,
      color: order.colors ?? null,
      colors: order.colors ?? null,
      sizes: order.sizes ?? null,
      receivedDate: order.receivedDate,
      deliveryDate: order.deliveryDate ?? null,
      responsible: responsible?.worker.fullName ?? null,
      status: order.status,
      statusCode,
      stage: statusCode,
      priority: order.priority,
      priorityCode,
      cost: order.estimatedCost,
      estimatedCost: order.estimatedCost,
      finalPrice: order.finalPrice,
      profit: this.roundMoney(order.finalPrice - order.estimatedCost),
      delayed,
      workers: (order.workers ?? []).map(
        (assignment) => assignment.worker.fullName,
      ),
      notes: order.notes ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private serializeDetails(order: Order) {
    const summary = this.serializeOrder(order);
    const assignments = [...order.workers].sort((left, right) =>
      left.assignedDate.localeCompare(right.assignedDate),
    );
    const histories = [...order.statusHistory].sort((left, right) => {
      const dateOrder = left.date.localeCompare(right.date);
      return dateOrder || left.id - right.id;
    });
    const costs = this.buildCosts(order);
    const currentIndex = STATUS_FLOW.indexOf(order.status);

    return {
      ...summary,
      client: {
        id: order.customer?.id ?? null,
        fullName: order.customer?.fullName ?? order.customerName ?? '-',
        phone: order.customer?.phone ?? order.customerPhone ?? '',
        historyUrl: order.customer
          ? `/sales/customers/${order.customer.id}/history`
          : null,
      },
      productDetails: {
        type: order.productType,
        quantity: order.quantity,
        colors: order.colors ?? null,
        sizes: order.sizes ?? null,
        notes: order.notes ?? null,
      },
      workflow: STATUS_FLOW.map((status, index) => {
        const history = [...histories]
          .reverse()
          .find((entry) => entry.status === status);
        const assignment = assignments.find((entry) => entry.stage === status);
        return {
          status,
          statusCode: this.enumKey(OrderStatus, status),
          reached: Boolean(history) || index <= currentIndex,
          current: status === order.status,
          date: history?.date ?? null,
          responsible:
            history?.responsible?.fullName ??
            history?.responsibleName ??
            assignment?.worker.fullName ??
            null,
          comment: history?.comment ?? assignment?.notes ?? null,
        };
      }),
      workers: assignments.map((assignment) => ({
        id: assignment.id,
        workerId: assignment.worker.id,
        fullName: assignment.worker.fullName,
        role: assignment.worker.role,
        stage: assignment.stage,
        stageCode: this.enumKey(OrderStatus, assignment.stage),
        assignedDate: assignment.assignedDate,
        completedPieces: assignment.completedPieces,
        laborCost: this.calculateAssignmentCost(assignment),
        notes: assignment.notes ?? null,
      })),
      materials: order.materials.map((material) => ({
        id: material.id,
        inventoryItemId: material.inventoryItem?.id ?? null,
        name: material.materialName,
        quantityUsed: material.quantityUsed,
        unit: material.unit,
        unitCost: material.unitCost,
        totalCost: material.totalCost,
        notes: material.notes ?? null,
      })),
      costs,
    };
  }

  private buildCosts(order: Order): ProductionCosts {
    const materialCost = this.roundMoney(
      order.materials.reduce((sum, material) => sum + material.totalCost, 0),
    );
    const laborCost = this.roundMoney(
      order.workers.reduce(
        (sum, assignment) => sum + this.calculateAssignmentCost(assignment),
        0,
      ),
    );
    const totalCost = this.roundMoney(materialCost + laborCost);
    const salePrice = this.roundMoney(order.finalPrice);
    return {
      materialCost,
      laborCost,
      totalCost,
      salePrice,
      profit: this.roundMoney(salePrice - totalCost),
    };
  }

  private getResponsibleAssignment(order: Order) {
    return [...(order.workers ?? [])]
      .filter((assignment) => assignment.stage === order.status)
      .sort((left, right) => right.id - left.id)[0];
  }

  private isDelayed(order: Order) {
    return Boolean(
      order.deliveryDate &&
      order.deliveryDate < this.toDateKey(new Date()) &&
      order.status !== OrderStatus.DELIVERED,
    );
  }

  private enumKey<T extends Record<string, string>>(
    enumType: T,
    value: string,
  ) {
    return (
      Object.entries(enumType).find(([, item]) => item === value)?.[0] ?? ''
    );
  }

  private deriveStockStatus(quantity: number, minStockAlert: number) {
    if (quantity <= 0) return StockStatus.OUT_OF_STOCK;
    if (quantity <= minStockAlert) return StockStatus.LOW_STOCK;
    return StockStatus.AVAILABLE;
  }

  private validateDates(receivedDate: string, deliveryDate?: string) {
    if (deliveryDate && deliveryDate < receivedDate) {
      throw new BadRequestException(
        'deliveryDate cannot be earlier than receivedDate',
      );
    }
  }

  private async seedOrdersIfEmpty() {
    if ((await this.ordersRepository.count()) > 0) return;

    await this.dataSource.transaction(async (manager) => {
      const today = new Date();
      const todayKey = this.toDateKey(today);
      const customers = manager.getRepository(Customer);
      const workers = manager.getRepository(Worker);
      const inventory = manager.getRepository(InventoryItem);

      let customer = await customers.findOne({
        where: {
          fullName: '\u0633\u0639\u0627\u062f \u0645\u0631\u0632\u0648\u0642',
        },
      });
      if (!customer) {
        customer = await customers.save(
          customers.create({
            fullName: '\u0633\u0639\u0627\u062f \u0645\u0631\u0632\u0648\u0642',
            phone: '0780000000',
            firstVisitDate: todayKey,
            lastVisitDate: todayKey,
            totalPurchases: 0,
            totalPaid: 0,
            totalDebt: 0,
          }),
        );
      }

      let worker = await workers.findOne({
        where: { fullName: 'Ahmed Ben Ali' },
      });
      if (!worker) {
        worker = await workers.save(
          workers.create({
            fullName: 'Ahmed Ben Ali',
            phone: '0550000000',
            role: WorkerRole.TAILOR,
            salaryType: SalaryType.PIECE,
            salaryValue: 80,
            startDate: todayKey,
            status: WorkerStatus.ACTIVE,
            notes: 'Production demo worker',
          }),
        );
      }

      let fabric = await inventory.findOne({
        where: { name: '\u0642\u0645\u0627\u0634 \u0642\u0637\u0646\u064a' },
      });
      if (!fabric) {
        fabric = await inventory.save(
          inventory.create({
            name: '\u0642\u0645\u0627\u0634 \u0642\u0637\u0646\u064a',
            category: InventoryCategory.FABRIC,
            type: '\u0642\u0637\u0646',
            quantity: 200,
            unit: '\u0645\u062a\u0631',
            unitPrice: 500,
            minStockAlert: 20,
            status: StockStatus.AVAILABLE,
          }),
        );
      }

      let thread = await inventory.findOne({
        where: { name: '\u062e\u064a\u0637 \u0623\u0633\u0648\u062f' },
      });
      if (!thread) {
        thread = await inventory.save(
          inventory.create({
            name: '\u062e\u064a\u0637 \u0623\u0633\u0648\u062f',
            category: InventoryCategory.THREAD,
            type: '\u062e\u064a\u0637 \u062e\u064a\u0627\u0637\u0629',
            color: '\u0623\u0633\u0648\u062f',
            quantity: 50,
            unit: '\u0628\u0643\u0631\u0629',
            unitPrice: 150,
            minStockAlert: 10,
            status: StockStatus.AVAILABLE,
          }),
        );
      }
      const order = await manager.getRepository(Order).save(
        manager.getRepository(Order).create({
          orderNumber: '#ORD-1024',
          customer,
          customerName: customer.fullName,
          customerPhone: customer.phone,
          productType:
            '\u0642\u0645\u064a\u0635 \u0631\u062c\u0627\u0644\u064a',
          quantity: 3,
          colors: '\u0623\u0628\u064a\u0636',
          sizes: 'M / L',
          status: OrderStatus.SEWING,
          priority: OrderPriority.NORMAL,
          receivedDate: this.toDateKey(this.shiftDate(today, -2)),
          deliveryDate: this.toDateKey(this.shiftDate(today, 12)),
          estimatedCost: 0,
          finalPrice: 35000,
          notes:
            '\u062a\u0634\u0637\u064a\u0628 \u0639\u0627\u0644\u064a \u0627\u0644\u062c\u0648\u062f\u0629',
        }),
      );

      const assignment = await manager.getRepository(OrderWorker).save(
        manager.getRepository(OrderWorker).create({
          order,
          worker,
          stage: OrderStatus.SEWING,
          assignedDate: todayKey,
          completedPieces: 3,
          notes:
            '\u062e\u064a\u0627\u0637\u0629 \u0627\u0644\u0642\u0645\u0635\u0627\u0646',
        }),
      );

      await manager.getRepository(OrderStatusHistory).save([
        manager.getRepository(OrderStatusHistory).create({
          order,
          status: OrderStatus.NEW,
          date: order.receivedDate,
          comment:
            '\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0637\u0644\u0628\u064a\u0629',
        }),
        manager.getRepository(OrderStatusHistory).create({
          order,
          status: OrderStatus.CUTTING,
          date: this.toDateKey(this.shiftDate(today, -1)),
          comment:
            '\u0627\u0643\u062a\u0645\u0644 \u0642\u0635 \u0627\u0644\u0642\u0645\u0627\u0634',
        }),
        manager.getRepository(OrderStatusHistory).create({
          order,
          status: OrderStatus.SEWING,
          date: todayKey,
          responsible: worker,
          responsibleName: worker.fullName,
          comment: assignment.notes,
        }),
      ]);

      await this.consumeMaterial(manager, order, fabric, {
        inventoryItemId: fabric.id,
        quantityUsed: 5,
        notes:
          '\u0642\u0645\u0627\u0634 \u0644\u0644\u0642\u0645\u0635\u0627\u0646',
      });
      await this.consumeMaterial(manager, order, thread, {
        inventoryItemId: thread.id,
        quantityUsed: 2,
        notes: '\u062e\u064a\u0637 \u0627\u0644\u062e\u064a\u0627\u0637\u0629',
      });
      await this.recalculateProductionCost(manager, order.id);
    });
  }

  private normalizeOptionalText(value?: string) {
    const normalized = value?.trim();
    return normalized || undefined;
  }

  private normalizePage(value?: number) {
    return Math.max(DEFAULT_PAGE, Math.floor(value ?? DEFAULT_PAGE));
  }

  private normalizeLimit(value?: number) {
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(value ?? DEFAULT_LIMIT)));
  }

  private buildPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  private buildListResponse<T>(data: T[], pagination: PaginationPayload) {
    return { data, pagination };
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundQuantity(value: number) {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }

  private shiftDate(date: Date, days: number) {
    const shifted = new Date(date);
    shifted.setDate(shifted.getDate() + days);
    return shifted;
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
