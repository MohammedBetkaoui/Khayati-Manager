import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SalaryType, WorkerRole, WorkerStatus } from '../../common/enums';
import { Advance } from '../../payroll/entities/advance.entity';
import { BonusDeduction } from '../../payroll/entities/bonus-deduction.entity';
import { Payroll } from '../../payroll/entities/payroll.entity';
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

  @Column({ type: 'simple-enum', enum: WorkerRole })
  role!: WorkerRole;

  @Column({ type: 'simple-enum', enum: SalaryType })
  salaryType!: SalaryType;

  @Column({ type: 'real', default: 0 })
  salaryValue!: number;

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

  @OneToMany(() => BonusDeduction, (record) => record.worker)
  bonusDeductions!: BonusDeduction[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
