import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplierStatus } from '../../common/enums';
import { InventoryItem } from './inventory-item.entity';
import { SupplierAdvance } from './supplier-advance.entity';
import { SupplierPayment } from './supplier-payment.entity';
import { SupplierPurchase } from './supplier-purchase.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'text', nullable: true })
  city?: string | null;

  @Column({
    type: 'simple-enum',
    enum: SupplierStatus,
    default: SupplierStatus.ACTIVE,
  })
  status!: SupplierStatus;

  @Column({ type: 'real', default: 0 })
  totalPurchases!: number;

  @Column({ type: 'real', default: 0 })
  totalPaid!: number;

  @Column({ type: 'real', default: 0 })
  totalDebt!: number;

  @Column({ type: 'date', nullable: true })
  lastPurchaseDate?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'datetime', nullable: true })
  archivedAt?: Date | null;

  @OneToMany(() => InventoryItem, (item) => item.supplierEntity)
  inventoryItems!: InventoryItem[];

  @OneToMany(() => SupplierPurchase, (purchase) => purchase.supplier)
  purchases!: SupplierPurchase[];

  @OneToMany(() => SupplierPayment, (payment) => payment.supplier)
  payments!: SupplierPayment[];

  @OneToMany(() => SupplierAdvance, (advance) => advance.supplier)
  advances!: SupplierAdvance[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
