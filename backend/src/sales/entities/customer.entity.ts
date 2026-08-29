import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerStatus, CustomerType } from '../../common/enums';
import { Order } from '../../orders/entities/order.entity';
import { LegacyDebt } from '../../legacy-debts/entities/legacy-debt.entity';
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
  secondPhone?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'text', nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  city?: string | null;

  @Column({ type: 'text', nullable: true })
  wilaya?: string | null;

  @Column({
    type: 'simple-enum',
    enum: CustomerType,
    default: CustomerType.REGULAR,
  })
  type!: CustomerType;

  @Column({
    type: 'simple-enum',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status!: CustomerStatus;

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
  notes?: string | null;

  @Column({ type: 'datetime', nullable: true })
  archivedAt?: Date | null;

  @OneToMany(() => Invoice, (invoice) => invoice.customer)
  invoices!: Invoice[];

  @OneToMany(() => Order, (order) => order.customer)
  orders!: Order[];

  @OneToMany(() => Payment, (payment) => payment.customer)
  payments!: Payment[];

  @OneToMany(() => CustomerMeasurement, (measurement) => measurement.customer)
  measurements!: CustomerMeasurement[];

  @OneToMany(() => CustomerNote, (note) => note.customer)
  customerNotes!: CustomerNote[];

  @OneToMany(() => LegacyDebt, (debt) => debt.customer)
  legacyDebts!: LegacyDebt[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
