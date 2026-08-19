import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductStockMovementType } from '../../common/enums';
import { FinishedProduct } from './finished-product.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('product_stock_movements')
export class ProductStockMovement {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => FinishedProduct, (product) => product.stockMovements, {
    onDelete: 'CASCADE',
  })
  product!: FinishedProduct;

  @ManyToOne(() => ProductVariant, (variant) => variant.stockMovements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  variant?: ProductVariant | null;

  @Column({ type: 'simple-enum', enum: ProductStockMovementType })
  type!: ProductStockMovementType;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'integer' })
  previousQuantity!: number;

  @Column({ type: 'integer' })
  newQuantity!: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  reference?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
