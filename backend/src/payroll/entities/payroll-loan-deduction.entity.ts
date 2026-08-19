import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Loan } from './loan.entity';
import { Payroll } from './payroll.entity';

@Entity('payroll_loan_deductions')
export class PayrollLoanDeduction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Payroll, (payroll) => payroll.loanDeductions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  payroll!: Payroll;

  @ManyToOne(() => Loan, (loan) => loan.payrollDeductions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  loan!: Loan;

  @Column({ type: 'real' })
  amount!: number;
}
