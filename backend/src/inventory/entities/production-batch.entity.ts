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
import { ProductVariant } from './product-variant.entity';
import { ProductionMaterial } from './production-material.entity';

@Entity('production_batches')
export class ProductionBatch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 80 })
  batchNumber!: string;

  @ManyToOne(() => FinishedProduct, (product) => product.productions, {
    onDelete: 'CASCADE',
  })
  product!: FinishedProduct;

  @ManyToOne(() => ProductVariant, (variant) => variant.productions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  variant?: ProductVariant | null;

  @Column({ type: 'integer' })
  quantityProduced!: number;

  @Column({ type: 'real', default: 0 })
  materialCost!: number;

  @Column({ type: 'real', default: 0 })
  additionalCost!: number;

  @Column({ type: 'real', default: 0 })
  totalCost!: number;

  @Column({ type: 'real', default: 0 })
  unitCost!: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => ProductionMaterial, (material) => material.productionBatch, {
    cascade: ['insert'],
  })
  materials!: ProductionMaterial[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
