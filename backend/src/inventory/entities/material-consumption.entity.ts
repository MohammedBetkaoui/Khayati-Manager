import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';
import { ProductionBatch } from './production-batch.entity';

@Entity('material_consumptions')
export class MaterialConsumption {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => InventoryItem, (item) => item.materialConsumptions, {
    onDelete: 'CASCADE',
  })
  inventoryItem!: InventoryItem;

  @ManyToOne(() => ProductionBatch, { nullable: true, onDelete: 'SET NULL' })
  productionBatch?: ProductionBatch | null;

  @Column({ type: 'real' })
  quantityUsed!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ name: 'orderId', type: 'text', nullable: true })
  reference?: string | null;

  @Column({ type: 'real', default: 0 })
  cost!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
