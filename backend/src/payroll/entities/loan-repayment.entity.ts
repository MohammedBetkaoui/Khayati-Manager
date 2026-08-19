import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PayrollPaymentMethod } from '../../common/enums';
import { Loan } from './loan.entity';
import { Payroll } from './payroll.entity';

@Entity('loan_repayments')
export class LoanRepayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Loan, (loan) => loan.repayments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  loan!: Loan;

  @ManyToOne(() => Payroll, { nullable: true, onDelete: 'RESTRICT' })
  payroll?: Payroll | null;

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
}
