import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  CustomerCreditDirection,
  CustomerCreditTransactionType,
  PaymentMethod,
} from '../../common/enums';
import { toMinorUnits } from '../../common/money';
import { LegacyDebt } from '../../legacy-debts/entities/legacy-debt.entity';
import { LegacyDebtPayment } from '../../legacy-debts/entities/legacy-debt-payment.entity';
import { Customer } from '../../sales/entities/customer.entity';
import { Invoice } from '../../sales/entities/invoice.entity';
import { Payment } from '../../sales/entities/payment.entity';

@Entity('customer_credit_transactions')
@Index('IDX_customer_credit_customer_date', ['customer', 'transactionDate'])
export class CustomerCreditTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Customer, (customer) => customer.creditTransactions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  customer!: Customer;

  @Column({ type: 'simple-enum', enum: CustomerCreditTransactionType })
  type!: CustomerCreditTransactionType;

  @Column({ type: 'simple-enum', enum: CustomerCreditDirection })
  direction!: CustomerCreditDirection;

  @Column({ type: 'real' })
  amount!: number;

  @Column({ type: 'integer' })
  amountMinor!: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  transactionDate!: string;

  @Column({ type: 'simple-enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod | null;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'RESTRICT' })
  invoice?: Invoice | null;

  @ManyToOne(() => Payment, { nullable: true, onDelete: 'RESTRICT' })
  payment?: Payment | null;

  @ManyToOne(() => LegacyDebt, { nullable: true, onDelete: 'RESTRICT' })
  legacyDebt?: LegacyDebt | null;

  @ManyToOne(() => LegacyDebtPayment, { nullable: true, onDelete: 'RESTRICT' })
  legacyDebtPayment?: LegacyDebtPayment | null;

  @ManyToOne(() => CustomerCreditTransaction, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  reversalOf?: CustomerCreditTransaction | null;

  @Column({ type: 'real', default: 0 })
  balanceAfter!: number;

  @Column({ type: 'integer', default: 0 })
  balanceAfterMinor!: number;

  @Column({ type: 'text', nullable: true })
  reference?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'datetime', nullable: true })
  reversedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  reversalReason?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  syncMinorAmounts() {
    this.amountMinor = toMinorUnits(this.amount);
    this.balanceAfterMinor = toMinorUnits(this.balanceAfter);
  }
}
