import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerProduction } from '../workers/entities/worker-production.entity';
import { Worker } from '../workers/entities/worker.entity';
import { Advance } from './entities/advance.entity';
import { BonusDeduction } from './entities/bonus-deduction.entity';
import { Payroll } from './entities/payroll.entity';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payroll,
      Advance,
      BonusDeduction,
      Worker,
      WorkerProduction,
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
