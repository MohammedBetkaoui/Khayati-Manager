import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { FinishedProductsService } from './finished-products.service';
import { FinishedProduct } from './entities/finished-product.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { MaterialConsumption } from './entities/material-consumption.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Supplier } from './entities/supplier.entity';
import { ProductStockMovement } from './entities/product-stock-movement.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductionBatch } from './entities/production-batch.entity';
import { ProductionMaterial } from './entities/production-material.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItem,
      StockMovement,
      Supplier,
      MaterialConsumption,
      FinishedProduct,
      ProductVariant,
      ProductionBatch,
      ProductionMaterial,
      ProductStockMovement,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, FinishedProductsService],
  exports: [InventoryService, FinishedProductsService],
})
export class InventoryModule {}
