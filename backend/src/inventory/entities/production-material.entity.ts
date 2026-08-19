import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { ProductionBatch } from './production-batch.entity';

@Entity('production_materials')
export class ProductionMaterial {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ProductionBatch, (batch) => batch.materials, {
    onDelete: 'CASCADE',
  })
  productionBatch!: ProductionBatch;

  @ManyToOne(() => InventoryItem, (item) => item.productionMaterialUsages, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  inventoryItem?: InventoryItem | null;

  @Column()
  materialName!: string;

  @Column()
  unit!: string;

  @Column({ type: 'real' })
  quantityUsed!: number;

  @Column({ type: 'real', default: 0 })
  unitCost!: number;

  @Column({ type: 'real', default: 0 })
  totalCost!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
