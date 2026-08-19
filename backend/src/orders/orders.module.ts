import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Worker } from '../workers/entities/worker.entity';
import { OrderMaterial } from './entities/order-material.entity';
import { OrderWorkerAssignment } from './entities/order-worker-assignment.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderWorkerAssignment,
      OrderMaterial,
      Worker,
      InventoryItem,
      Customer,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
