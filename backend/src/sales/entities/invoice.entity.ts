import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod, PaymentStatus } from '../../common/enums';
import { Order } from '../../orders/entities/order.entity';
import { Customer } from './customer.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Payment } from './payment.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  invoiceNumber!: string;

  @ManyToOne(() => Customer, (customer) => customer.invoices, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  customer?: Customer;

  @ManyToOne(() => Order, (order) => order.invoices, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  order?: Order;

  @Column({ type: 'date' })
  invoiceDate!: string;

  @Column({ type: 'real', default: 0 })
  subtotal!: number;

  @Column({ type: 'real', default: 0 })
  discount!: number;

  @Column({ type: 'real', default: 0 })
  totalAmount!: number;

  @Column({ type: 'real', default: 0 })
  paidAmount!: number;

  @Column({ type: 'real', default: 0 })
  remainingAmount!: number;

  @Column({ type: 'simple-enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({
    type: 'simple-enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus!: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice)
  items!: InvoiceItem[];

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments!: Payment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
