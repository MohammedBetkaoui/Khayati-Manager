import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SalaryType, WorkerStatus } from '../../common/enums';
import { Advance } from '../../payroll/entities/advance.entity';
import { Loan } from '../../payroll/entities/loan.entity';
import { Payroll } from '../../payroll/entities/payroll.entity';
import { SalaryPayment } from '../../payroll/entities/salary-payment.entity';
import { Attendance } from './attendance.entity';
import { WorkerProduction } from './worker-production.entity';

@Entity('workers')
export class Worker {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  fullName!: string;

  @Column({ type: 'text', nullable: true })
  phone?: string | null;

  @Column({ type: 'text' })
  role!: string;

  @Column({ type: 'simple-enum', enum: SalaryType })
  salaryType!: SalaryType;

  @Column({ type: 'real', default: 0 })
  monthlySalary!: number;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({
    type: 'simple-enum',
    enum: WorkerStatus,
    default: WorkerStatus.ACTIVE,
  })
  status!: WorkerStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => Attendance, (attendance) => attendance.worker)
  attendances!: Attendance[];

  @OneToMany(() => WorkerProduction, (production) => production.worker)
  productions!: WorkerProduction[];

  @OneToMany(() => Payroll, (payroll) => payroll.worker)
  payrolls!: Payroll[];

  @OneToMany(() => Advance, (advance) => advance.worker)
  advances!: Advance[];

  @OneToMany(() => Loan, (loan) => loan.worker)
  loans!: Loan[];

  @OneToMany(() => SalaryPayment, (payment) => payment.worker)
  salaryPayments!: SalaryPayment[];

  @Column({ type: 'datetime', nullable: true })
  archivedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
