import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ExpenseCategory,
  ExpenseType,
  PaymentMethod,
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

  @Column({ type: 'simple-enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'date' })
  date!: string;

  @Column({ nullable: true })
  supplier?: string;

  @Column({ nullable: true })
  linkedTo?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
