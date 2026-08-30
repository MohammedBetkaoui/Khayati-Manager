import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../expenses/entities/expense.entity';
import { FinishedProduct } from '../inventory/entities/finished-product.entity';
import { ProductionBatch } from '../inventory/entities/production-batch.entity';
import { SupplierAdvance } from '../inventory/entities/supplier-advance.entity';
import { SupplierPayment } from '../inventory/entities/supplier-payment.entity';
import { SupplierPurchase } from '../inventory/entities/supplier-purchase.entity';
import { Supplier } from '../inventory/entities/supplier.entity';
import { Advance } from '../payroll/entities/advance.entity';
import { Payroll } from '../payroll/entities/payroll.entity';
import { SalaryPayment } from '../payroll/entities/salary-payment.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { Payment } from '../sales/entities/payment.entity';
import { LegacyDebt } from '../legacy-debts/entities/legacy-debt.entity';
import { LegacyDebtPayment } from '../legacy-debts/entities/legacy-debt-payment.entity';
import { CustomerCreditTransaction } from '../customer-credits/entities/customer-credit-transaction.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      Payment,
      Customer,
      Expense,
      Payroll,
      SalaryPayment,
      Advance,
      Supplier,
      SupplierPurchase,
      SupplierPayment,
      SupplierAdvance,
      FinishedProduct,
      ProductionBatch,
      LegacyDebt,
      LegacyDebtPayment,
      CustomerCreditTransaction,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
