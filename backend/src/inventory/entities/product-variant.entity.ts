import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FinishedProduct } from './finished-product.entity';
import { ProductStockMovement } from './product-stock-movement.entity';
import { ProductionBatch } from './production-batch.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => FinishedProduct, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  product!: FinishedProduct;

  @Column({ unique: true, length: 100 })
  sku!: string;

  @Column({ type: 'text', nullable: true })
  size?: string | null;

  @Column({ type: 'text', nullable: true })
  color?: string | null;

  @Column({ type: 'integer', default: 0 })
  quantityProduced!: number;

  @Column({ type: 'integer', default: 0 })
  quantityAvailable!: number;

  @Column({ type: 'integer', default: 0 })
  quantitySold!: number;

  @Column({ type: 'real', nullable: true })
  salePrice?: number | null;

  @Column({ default: true })
  active!: boolean;

  @OneToMany(() => ProductionBatch, (batch) => batch.variant)
  productions!: ProductionBatch[];

  @OneToMany(() => ProductStockMovement, (movement) => movement.variant)
  stockMovements!: ProductStockMovement[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
