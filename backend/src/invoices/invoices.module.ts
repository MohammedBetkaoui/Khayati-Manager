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
import { CustomerCreditsModule } from '../customer-credits/customer-credits.module';
import { DocumentSequence } from './entities/document-sequence.entity';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    CustomerCreditsModule,
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
  controllers: [InvoicesController],
  providers: [InvoiceNumberService, InvoicesService, InvoicePdfService],
  exports: [
    TypeOrmModule,
    InvoiceNumberService,
    InvoicesService,
    InvoicePdfService,
  ],
})
export class InvoicesModule {}
