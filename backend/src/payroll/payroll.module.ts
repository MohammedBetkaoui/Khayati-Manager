import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Worker } from '../workers/entities/worker.entity';
import { Advance } from './entities/advance.entity';
import { LoanRepayment } from './entities/loan-repayment.entity';
import { Loan } from './entities/loan.entity';
import { PayrollAdvanceDeduction } from './entities/payroll-advance-deduction.entity';
import { PayrollLoanDeduction } from './entities/payroll-loan-deduction.entity';
import { Payroll } from './entities/payroll.entity';
import { SalaryPayment } from './entities/salary-payment.entity';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payroll,
      Advance,
      SalaryPayment,
      Loan,
      LoanRepayment,
      PayrollAdvanceDeduction,
      PayrollLoanDeduction,
      Worker,
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
