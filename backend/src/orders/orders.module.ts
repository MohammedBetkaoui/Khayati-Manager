import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { MaterialConsumption } from '../inventory/entities/material-consumption.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { CustomerNote } from '../sales/entities/customer-note.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Worker } from '../workers/entities/worker.entity';
import { OrderMaterial } from './entities/order-material.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { OrderWorker } from './entities/order-worker.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderWorker,
      OrderMaterial,
      OrderStatusHistory,
      Worker,
      InventoryItem,
      StockMovement,
      MaterialConsumption,
      Customer,
      CustomerNote,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
