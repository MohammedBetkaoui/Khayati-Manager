import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payroll } from '../payroll/entities/payroll.entity';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';
import { Attendance } from './entities/attendance.entity';
import { WorkerProduction } from './entities/worker-production.entity';
import { Worker } from './entities/worker.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Worker, Attendance, WorkerProduction, Payroll]),
  ],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
