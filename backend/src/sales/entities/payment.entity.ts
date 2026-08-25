import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod } from '../../common/enums';
import { toMinorUnits } from '../../common/money';
import { Customer } from './customer.entity';
import { Invoice } from './invoice.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Customer, (customer) => customer.payments, {
    onDelete: 'RESTRICT',
  })
  customer!: Customer;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  invoice?: Invoice | null;

  @Column({ type: 'real' })
  amount!: number;

  @Column({ type: 'integer', default: 0 })
  amountMinor!: number;

  @Column({ type: 'simple-enum', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  reference?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  syncMinorAmount() {
    this.amountMinor = toMinorUnits(this.amount);
  }
}
