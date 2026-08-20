import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplierPurchaseStatus } from '../../common/enums';
import { InventoryItem } from './inventory-item.entity';
import { SupplierPayment } from './supplier-payment.entity';
import { Supplier } from './supplier.entity';

@Entity('supplier_purchases')
export class SupplierPurchase {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchases, {
    onDelete: 'RESTRICT',
  })
  supplier!: Supplier;

  @ManyToOne(() => InventoryItem, (item) => item.supplierPurchases, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  inventoryItem?: InventoryItem | null;

  @Column()
  materialName!: string;

  @Column({ type: 'text', nullable: true })
  materialColor?: string | null;

  @Column({ type: 'real' })
  quantityPurchased!: number;

  @Column()
  unit!: string;

  @Column({ type: 'real' })
  totalAmount!: number;

  @Column({ type: 'real', default: 0 })
  paidAmount!: number;

  @Column({ type: 'real', default: 0 })
  remainingAmount!: number;

  @Column({
    type: 'simple-enum',
    enum: SupplierPurchaseStatus,
    default: SupplierPurchaseStatus.UNPAID,
  })
  paymentStatus!: SupplierPurchaseStatus;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  purchaseDate!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => SupplierPayment, (payment) => payment.purchase)
  payments!: SupplierPayment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
