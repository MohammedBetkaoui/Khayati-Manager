import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ExpenseCategory,
  ExpenseSourceType,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
  RecurringFrequency,
} from '../../common/enums';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'simple-enum', enum: ExpenseCategory })
  category!: ExpenseCategory;

  @Column({ type: 'simple-enum', enum: ExpenseType })
  type!: ExpenseType;

  @Column({ type: 'real' })
  amount!: number;

  @Column({ type: 'real', default: 0 })
  paidAmount!: number;

  @Column({ type: 'real', default: 0 })
  remainingAmount!: number;

  @Column({
    type: 'simple-enum',
    enum: ExpenseStatus,
    default: ExpenseStatus.PAID,
  })
  status!: ExpenseStatus;

  @Column({
    type: 'simple-enum',
    enum: ExpenseSourceType,
    default: ExpenseSourceType.MANUAL,
  })
  sourceType!: ExpenseSourceType;

  @Column({ type: 'simple-enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  supplier?: string | null;

  @Column({ type: 'text', nullable: true })
  linkedTo?: string | null;

  @Column({ type: 'boolean', default: false })
  isRecurring!: boolean;

  @Column({ type: 'simple-enum', enum: RecurringFrequency, nullable: true })
  frequency?: RecurringFrequency | null;

  @Column({ type: 'date', nullable: true })
  nextDueDate?: string | null;

  @Column({ type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'datetime', nullable: true })
  archivedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
