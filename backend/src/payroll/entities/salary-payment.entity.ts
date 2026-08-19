import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PayrollPaymentMethod } from '../../common/enums';
import { Worker } from '../../workers/entities/worker.entity';
import { Payroll } from './payroll.entity';

@Entity('salary_payments')
export class SalaryPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Payroll, (payroll) => payroll.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  payroll!: Payroll;

  @ManyToOne(() => Worker, (worker) => worker.salaryPayments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  worker!: Worker;

  @Column({ type: 'real' })
  amount!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'simple-enum', enum: PayrollPaymentMethod })
  method!: PayrollPaymentMethod;

  @Column({ type: 'varchar', nullable: true })
  reference?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
