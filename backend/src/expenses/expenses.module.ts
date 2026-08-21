import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierAdvance } from '../inventory/entities/supplier-advance.entity';
import { SupplierPayment } from '../inventory/entities/supplier-payment.entity';
import { SupplierPurchase } from '../inventory/entities/supplier-purchase.entity';
import { Supplier } from '../inventory/entities/supplier.entity';
import { Payroll } from '../payroll/entities/payroll.entity';
import { SalaryPayment } from '../payroll/entities/salary-payment.entity';
import { Invoice } from '../sales/entities/invoice.entity';
import { Expense } from './entities/expense.entity';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Expense,
      Supplier,
      SupplierPurchase,
      SupplierPayment,
      SupplierAdvance,
      Payroll,
      SalaryPayment,
      Invoice,
    ]),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
