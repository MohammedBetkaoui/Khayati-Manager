import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod } from '../../common/enums';
import { Customer } from './customer.entity';
import { Invoice } from './invoice.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Customer, (customer) => customer.payments, {
    onDelete: 'CASCADE',
  })
  customer!: Customer;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, {
    onDelete: 'CASCADE',
  })
  invoice!: Invoice;

  @Column({ type: 'real' })
  amount!: number;

  @Column({ type: 'simple-enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date!: string;

  @Column({ nullable: true })
  reference?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
