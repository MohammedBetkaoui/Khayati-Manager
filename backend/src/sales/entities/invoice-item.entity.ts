import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FinishedProduct } from '../../inventory/entities/finished-product.entity';
import { ProductVariant } from '../../inventory/entities/product-variant.entity';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, {
    onDelete: 'CASCADE',
  })
  invoice!: Invoice;

  @ManyToOne(() => FinishedProduct, { nullable: true, onDelete: 'SET NULL' })
  product?: FinishedProduct | null;

  @ManyToOne(() => ProductVariant, { nullable: true, onDelete: 'SET NULL' })
  variant?: ProductVariant | null;

  @Column()
  description!: string;

  @Column({ nullable: true })
  productType?: string;

  @Column({ type: 'text', nullable: true })
  productSku?: string | null;

  @Column({ type: 'text', nullable: true })
  variantLabel?: string | null;

  @Column({ type: 'real', default: 1 })
  quantity!: number;

  @Column({ type: 'real', default: 0 })
  unitPrice!: number;

  @Column({ type: 'real', default: 0 })
  total!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
