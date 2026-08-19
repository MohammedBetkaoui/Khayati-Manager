import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Advance } from './advance.entity';
import { Payroll } from './payroll.entity';

@Entity('payroll_advance_deductions')
export class PayrollAdvanceDeduction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Payroll, (payroll) => payroll.advanceDeductions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  payroll!: Payroll;

  @ManyToOne(() => Advance, (advance) => advance.deductions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  advance!: Advance;

  @Column({ type: 'real' })
  amount!: number;
}
