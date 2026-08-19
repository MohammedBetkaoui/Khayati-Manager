import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinishedProduct } from '../inventory/entities/finished-product.entity';
import { ProductStockMovement } from '../inventory/entities/product-stock-movement.entity';
import { ProductVariant } from '../inventory/entities/product-variant.entity';
import { CustomerMeasurement } from './entities/customer-measurement.entity';
import { CustomerNote } from './entities/customer-note.entity';
import { Customer } from './entities/customer.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Invoice,
      InvoiceItem,
      Payment,
      CustomerNote,
      CustomerMeasurement,
      FinishedProduct,
      ProductVariant,
      ProductStockMovement,
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
