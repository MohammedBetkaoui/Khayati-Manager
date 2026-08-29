import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../inventory/entities/supplier.entity';
import { Customer } from '../sales/entities/customer.entity';
import { LegacyDebtPayment } from './entities/legacy-debt-payment.entity';
import { LegacyDebt } from './entities/legacy-debt.entity';
import { LegacyDebtsController } from './legacy-debts.controller';
import { LegacyDebtsService } from './legacy-debts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LegacyDebt,
      LegacyDebtPayment,
      Customer,
      Supplier,
    ]),
  ],
  controllers: [LegacyDebtsController],
  providers: [LegacyDebtsService],
  exports: [LegacyDebtsService, TypeOrmModule],
})
export class LegacyDebtsModule {}
