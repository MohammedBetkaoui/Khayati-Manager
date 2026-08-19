import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  FinishedProductCategory,
  FinishedProductStatus,
} from '../../common/enums';
import { ProductStockMovement } from './product-stock-movement.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductionBatch } from './production-batch.entity';

@Entity('finished_products')
export class FinishedProduct {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 180 })
  name!: string;

  @Column({ unique: true, length: 80 })
  sku!: string;

  @Column({ type: 'simple-enum', enum: FinishedProductCategory })
  category!: FinishedProductCategory;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  creationDate!: string;

  @Column({ type: 'real', default: 0 })
  salePrice!: number;

  @Column({ type: 'real', default: 0 })
  estimatedProductionCost!: number;

  @Column({ type: 'integer', default: 0 })
  quantityProduced!: number;

  @Column({ type: 'integer', default: 0 })
  quantityAvailable!: number;

  @Column({ type: 'integer', default: 0 })
  quantitySold!: number;

  @Column({ type: 'integer', default: 0 })
  minStockAlert!: number;

  @Column({
    type: 'simple-enum',
    enum: FinishedProductStatus,
    default: FinishedProductStatus.ACTIVE,
  })
  status!: FinishedProductStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: ['insert', 'update'],
  })
  variants!: ProductVariant[];

  @OneToMany(() => ProductionBatch, (batch) => batch.product)
  productions!: ProductionBatch[];

  @OneToMany(() => ProductStockMovement, (movement) => movement.product)
  stockMovements!: ProductStockMovement[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
