import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethod } from '../../common/enums';
import { toMinorUnits } from '../../common/money';
import { LegacyDebt } from './legacy-debt.entity';

@Entity('legacy_debt_payments')
export class LegacyDebtPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => LegacyDebt, (legacyDebt) => legacyDebt.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  legacyDebt!: LegacyDebt;

  @Column({ type: 'real' })
  amount!: number;

  @Column({ type: 'integer' })
  amountMinor!: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  paymentDate!: string;

  @Column({
    type: 'simple-enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'text', nullable: true })
  reference?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  syncMinorAmount() {
    this.amountMinor = toMinorUnits(this.amount);
  }
}
