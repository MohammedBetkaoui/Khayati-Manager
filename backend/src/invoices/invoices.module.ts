import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinishedProduct } from '../inventory/entities/finished-product.entity';
import { ProductVariant } from '../inventory/entities/product-variant.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Customer } from '../sales/entities/customer.entity';
import { InvoiceItem } from '../sales/entities/invoice-item.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { Payment } from '../sales/entities/payment.entity';
import { WorkshopSettings } from '../settings/entities/workshop-settings.entity';
import { DocumentSequence } from './entities/document-sequence.entity';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Payment,
      DocumentSequence,
      Customer,
      Order,
      OrderItem,
      FinishedProduct,
      ProductVariant,
      WorkshopSettings,
    ]),
  ],
  providers: [InvoiceNumberService, InvoicesService],
  exports: [TypeOrmModule, InvoicesService],
})
export class InvoicesModule {}
