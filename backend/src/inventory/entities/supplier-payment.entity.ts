import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod } from '../../common/enums';
import { SupplierPurchase } from './supplier-purchase.entity';
import { Supplier } from './supplier.entity';

@Entity('supplier_payments')
export class SupplierPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.payments, {
    onDelete: 'RESTRICT',
  })
  supplier!: Supplier;

  @ManyToOne(() => SupplierPurchase, (purchase) => purchase.payments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  purchase?: SupplierPurchase | null;

  @Column({ type: 'real' })
  amount!: number;

  @Column({
    type: 'simple-enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
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
}
