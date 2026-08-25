import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  DiscountType,
  InvoiceStatus,
  PaymentStatus,
} from '../../common/enums';
import { toMinorUnits } from '../../common/money';
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
    nullable: false,
    onDelete: 'RESTRICT',
  })
  customer!: Customer;

  @OneToOne(() => Order, (order) => order.invoice, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  order?: Order | null;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date!: string;

  @Column({ type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({ type: 'real', default: 0 })
  subtotal!: number;

  @Column({ type: 'real', default: 0 })
  discount!: number;

  @Column({
    type: 'simple-enum',
    enum: DiscountType,
    default: DiscountType.NONE,
  })
  discountType!: DiscountType;

  @Column({ type: 'real', default: 0 })
  discountValue!: number;

  @Column({ type: 'real', default: 0 })
  discountAmount!: number;

  @Column({ type: 'boolean', default: false })
  taxEnabled!: boolean;

  @Column({ type: 'real', default: 0 })
  taxRate!: number;

  @Column({ type: 'real', default: 0 })
  taxAmount!: number;

  @Column({ type: 'real', default: 0 })
  totalAmount!: number;

  @Column({ type: 'real', default: 0 })
  paidAmount!: number;

  @Column({ type: 'real', default: 0 })
  remainingAmount!: number;

  @Column({
    type: 'simple-enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus!: PaymentStatus;

  @Column({
    type: 'simple-enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.ISSUED,
  })
  invoiceStatus!: InvoiceStatus;

  @Column({ length: 3, default: 'DZD' })
  currency!: string;

  @Column({ type: 'integer', default: 0 })
  subtotalMinor!: number;

  @Column({ type: 'integer', default: 0 })
  discountAmountMinor!: number;

  @Column({ type: 'integer', default: 0 })
  taxAmountMinor!: number;

  @Column({ type: 'integer', default: 0 })
  totalAmountMinor!: number;

  @Column({ type: 'integer', default: 0 })
  paidAmountMinor!: number;

  @Column({ type: 'integer', default: 0 })
  remainingAmountMinor!: number;

  @Column({ type: 'simple-json', nullable: true })
  customerSnapshot?: InvoiceCustomerSnapshot | null;

  @Column({ type: 'simple-json', nullable: true })
  workshopSnapshot?: InvoiceWorkshopSnapshot | null;

  @Column({ type: 'text', nullable: true })
  orderNumberSnapshot?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string | null;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items!: InvoiceItem[];

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments!: Payment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  syncMinorAmounts() {
    if (!this.customerSnapshot && this.customer) {
      this.customerSnapshot = {
        fullName: this.customer.fullName,
        phone: this.customer.phone,
        address: this.customer.address ?? null,
        email: this.customer.email ?? null,
      };
    }
    if (!this.orderNumberSnapshot && this.order) {
      this.orderNumberSnapshot = this.order.orderNumber;
    }
    if (this.discountAmount === undefined || this.discountAmount === null) {
      this.discountAmount = this.discount ?? 0;
    }
    if (this.discountValue === undefined || this.discountValue === null) {
      this.discountValue = this.discount ?? 0;
    }
    if (!this.discountType) {
      this.discountType = this.discount
        ? DiscountType.FIXED
        : DiscountType.NONE;
    }

    this.subtotalMinor = toMinorUnits(this.subtotal);
    this.discountAmountMinor = toMinorUnits(this.discountAmount);
    this.taxAmountMinor = toMinorUnits(this.taxAmount);
    this.totalAmountMinor = toMinorUnits(this.totalAmount);
    this.paidAmountMinor = toMinorUnits(this.paidAmount);
    this.remainingAmountMinor = toMinorUnits(this.remainingAmount);
  }
}

export type InvoiceCustomerSnapshot = {
  fullName: string;
  phone: string;
  address: string | null;
  email: string | null;
};

export type InvoiceWorkshopSnapshot = {
  workshopName: string;
  commercialName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  commercialRegister: string | null;
  logoPath: string | null;
  stampPath: string | null;
  invoiceFooter: string | null;
};
