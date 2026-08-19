import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

@Entity('material_consumptions')
export class MaterialConsumption {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => InventoryItem, (item) => item.materialConsumptions, {
    onDelete: 'CASCADE',
  })
  inventoryItem!: InventoryItem;

  @Column({ type: 'real' })
  quantityUsed!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  orderId?: string | null;

  @Column({ type: 'real', default: 0 })
  cost!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
