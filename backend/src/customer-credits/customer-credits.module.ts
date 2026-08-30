import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegacyDebt } from '../legacy-debts/entities/legacy-debt.entity';
import { LegacyDebtPayment } from '../legacy-debts/entities/legacy-debt-payment.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { Payment } from '../sales/entities/payment.entity';
import { CustomerCreditsController } from './customer-credits.controller';
import { CustomerCreditsService } from './customer-credits.service';
import { CustomerCreditTransaction } from './entities/customer-credit-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerCreditTransaction,
      Customer,
      Invoice,
      Payment,
      LegacyDebt,
      LegacyDebtPayment,
    ]),
  ],
  controllers: [CustomerCreditsController],
  providers: [CustomerCreditsService],
  exports: [CustomerCreditsService, TypeOrmModule],
})
export class CustomerCreditsModule {}
