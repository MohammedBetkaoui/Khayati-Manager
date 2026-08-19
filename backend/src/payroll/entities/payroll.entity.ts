import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PayrollStatus, SalaryType } from '../../common/enums';
import { Worker } from '../../workers/entities/worker.entity';
import { PayrollAdvanceDeduction } from './payroll-advance-deduction.entity';
import { PayrollLoanDeduction } from './payroll-loan-deduction.entity';
import { SalaryPayment } from './salary-payment.entity';

@Entity('payrolls')
@Index(['worker', 'periodStart', 'periodEnd'])
export class Payroll {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Worker, (worker) => worker.payrolls, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  worker!: Worker;

  @Column({ type: 'date' })
  periodStart!: string;

  @Column({ type: 'date' })
  periodEnd!: string;

  @Column({ type: 'varchar', nullable: true })
  salaryMonth?: string | null;

  @Column({ type: 'simple-enum', enum: SalaryType })
  salaryTypeSnapshot!: SalaryType;

  @Column({ type: 'real', default: 0 })
  monthlySalarySnapshot!: number;

  @Column({ type: 'integer', default: 0 })
  installmentsInMonth!: number;

  @Column({ type: 'integer', default: 0 })
  installmentNumber!: number;

  @Column({ type: 'integer', default: 0 })
  piecesCompleted!: number;

  @Column({ type: 'real', default: 0 })
  piecePrice!: number;

  @Column({ type: 'real', default: 0 })
  grossAmount!: number;

  @Column({ type: 'real', default: 0 })
  advanceDeduction!: number;

  @Column({ type: 'real', default: 0 })
  loanDeduction!: number;

  @Column({ type: 'real', default: 0 })
  otherDeductions!: number;

  @Column({ type: 'real', default: 0 })
  amountDue!: number;

  @Column({ type: 'real', default: 0 })
  paidAmount!: number;

  @Column({ type: 'real', default: 0 })
  remainingAmount!: number;

  @Column({ type: 'simple-enum', enum: PayrollStatus })
  status!: PayrollStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string | null;

  @OneToMany(() => SalaryPayment, (payment) => payment.payroll)
  payments!: SalaryPayment[];

  @OneToMany(() => PayrollAdvanceDeduction, (item) => item.payroll)
  advanceDeductions!: PayrollAdvanceDeduction[];

  @OneToMany(() => PayrollLoanDeduction, (item) => item.payroll)
  loanDeductions!: PayrollLoanDeduction[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
