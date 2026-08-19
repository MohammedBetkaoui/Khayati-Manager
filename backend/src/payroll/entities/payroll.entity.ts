import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus, SalaryType } from '../../common/enums';
import { Worker } from '../../workers/entities/worker.entity';

@Entity('payrolls')
export class Payroll {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Worker, (worker) => worker.payrolls, {
    onDelete: 'CASCADE',
  })
  worker!: Worker;

  @Column({ type: 'date' })
  periodStart!: string;

  @Column({ type: 'date' })
  periodEnd!: string;

  @Column({ type: 'simple-enum', enum: SalaryType })
  salaryType!: SalaryType;

  @Column({ type: 'real', default: 0 })
  baseSalary!: number;

  @Column({ type: 'integer', default: 0 })
  workedDays!: number;

  @Column({ type: 'integer', default: 0 })
  absentDays!: number;

  @Column({ type: 'real', default: 0 })
  lateHours!: number;

  @Column({ type: 'integer', default: 0 })
  piecesCompleted!: number;

  @Column({ type: 'real', default: 0 })
  piecePrice!: number;

  @Column({ type: 'real', default: 0 })
  productionAmount!: number;

  @Column({ type: 'real', default: 0 })
  bonuses!: number;

  @Column({ type: 'real', default: 0 })
  deductions!: number;

  @Column({ type: 'real', default: 0 })
  advances!: number;

  @Column({ type: 'real', default: 0 })
  netSalary!: number;

  @Column({ type: 'real', default: 0 })
  paidAmount!: number;

  @Column({ type: 'real', default: 0 })
  remainingAmount!: number;

  @Column({
    type: 'simple-enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus!: PaymentStatus;

  @Column({ type: 'date', nullable: true })
  paymentDate?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
