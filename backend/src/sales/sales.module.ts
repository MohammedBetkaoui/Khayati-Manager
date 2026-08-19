import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
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
      Order,
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
