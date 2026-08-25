import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { toMinorUnits } from '../../common/money';
import { FinishedProduct } from '../../inventory/entities/finished-product.entity';
import { ProductVariant } from '../../inventory/entities/product-variant.entity';
import { Order } from './order.entity';

@Entity('sales_order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  order!: Order;

  @ManyToOne(() => FinishedProduct, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  product?: FinishedProduct | null;

  @ManyToOne(() => ProductVariant, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  variant?: ProductVariant | null;

  @Column({ length: 180 })
  productName!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  reference?: string | null;

  @Column({ type: 'text', nullable: true })
  variantSnapshot?: string | null;

  @Column({ type: 'text', nullable: true })
  size?: string | null;

  @Column({ type: 'text', nullable: true })
  color?: string | null;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'real', default: 0 })
  unitPrice!: number;

  @Column({ type: 'real', default: 0 })
  total!: number;

  @Column({ type: 'integer', default: 0 })
  unitPriceMinor!: number;

  @Column({ type: 'integer', default: 0 })
  totalMinor!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  syncMinorAmounts() {
    this.unitPriceMinor = toMinorUnits(this.unitPrice);
    this.totalMinor = toMinorUnits(this.total);
  }
}
