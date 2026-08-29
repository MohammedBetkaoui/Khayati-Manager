import {
  BeforeInsert,
  BeforeUpdate,
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LegacyDebtStatus, LegacyDebtType } from '../../common/enums';
import { toMinorUnits } from '../../common/money';
import { Supplier } from '../../inventory/entities/supplier.entity';
import { Customer } from '../../sales/entities/customer.entity';
import { LegacyDebtPayment } from './legacy-debt-payment.entity';

@Entity('legacy_debts')
@Check(
  'CHK_legacy_debt_owner',
  `("type" = 'CUSTOMER_RECEIVABLE' AND "customerId" IS NOT NULL AND "supplierId" IS NULL) OR ("type" = 'SUPPLIER_PAYABLE' AND "supplierId" IS NOT NULL AND "customerId" IS NULL)`,
)
export class LegacyDebt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'simple-enum', enum: LegacyDebtType })
  type!: LegacyDebtType;

  @ManyToOne(() => Customer, (customer) => customer.legacyDebts, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  customer?: Customer | null;

  @ManyToOne(() => Supplier, (supplier) => supplier.legacyDebts, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  supplier?: Supplier | null;

  @Column({ type: 'real' })
  originalAmount!: number;

  @Column({ type: 'real', default: 0 })
  paidAmount!: number;

  @Column({ type: 'real' })
  remainingAmount!: number;

  @Column({ type: 'integer' })
  originalAmountMinor!: number;

  @Column({ type: 'integer', default: 0 })
  paidAmountMinor!: number;

  @Column({ type: 'integer' })
  remainingAmountMinor!: number;

  @Column({ type: 'date', nullable: true })
  debtDate?: string | null;

  @Column({ type: 'boolean', default: false })
  dateIsUnknown!: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'real', nullable: true })
  quantity?: number | null;

  @Column({ type: 'text', nullable: true })
  unit?: string | null;

  @Column({ type: 'text', nullable: true })
  paperReference?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({
    type: 'simple-enum',
    enum: LegacyDebtStatus,
    default: LegacyDebtStatus.OPEN,
  })
  status!: LegacyDebtStatus;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string | null;

  @OneToMany(() => LegacyDebtPayment, (payment) => payment.legacyDebt)
  payments!: LegacyDebtPayment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  syncMinorAmounts() {
    this.originalAmountMinor = toMinorUnits(this.originalAmount);
    this.paidAmountMinor = toMinorUnits(this.paidAmount);
    this.remainingAmountMinor = toMinorUnits(this.remainingAmount);
  }
}
