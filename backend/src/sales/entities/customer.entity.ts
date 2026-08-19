import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { CustomerMeasurement } from './customer-measurement.entity';
import { CustomerNote } from './customer-note.entity';
import { Invoice } from './invoice.entity';
import { Payment } from './payment.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 160 })
  fullName!: string;

  @Column({ default: '' })
  phone!: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  firstVisitDate!: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  lastVisitDate!: string;

  @Column({ type: 'real', default: 0 })
  totalPurchases!: number;

  @Column({ type: 'real', default: 0 })
  totalPaid!: number;

  @Column({ type: 'real', default: 0 })
  totalDebt!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => Order, (order) => order.customer)
  orders!: Order[];

  @OneToMany(() => Invoice, (invoice) => invoice.customer)
  invoices!: Invoice[];

  @OneToMany(() => Payment, (payment) => payment.customer)
  payments!: Payment[];

  @OneToMany(() => CustomerMeasurement, (measurement) => measurement.customer)
  measurements!: CustomerMeasurement[];

  @OneToMany(() => CustomerNote, (note) => note.customer)
  customerNotes!: CustomerNote[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
