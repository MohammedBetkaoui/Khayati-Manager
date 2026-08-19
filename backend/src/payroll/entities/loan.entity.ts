import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LoanStatus } from '../../common/enums';
import { Worker } from '../../workers/entities/worker.entity';
import { LoanRepayment } from './loan-repayment.entity';
import { PayrollLoanDeduction } from './payroll-loan-deduction.entity';

@Entity('worker_loans')
export class Loan {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Worker, (worker) => worker.loans, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  worker!: Worker;

  @Column({ type: 'real' })
  initialAmount!: number;

  @Column({ type: 'real', default: 0 })
  repaidAmount!: number;

  @Column({ type: 'real' })
  remainingAmount!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'simple-enum', enum: LoanStatus, default: LoanStatus.OPEN })
  status!: LoanStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => LoanRepayment, (repayment) => repayment.loan)
  repayments!: LoanRepayment[];

  @OneToMany(() => PayrollLoanDeduction, (item) => item.loan)
  payrollDeductions!: PayrollLoanDeduction[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
