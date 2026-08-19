import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MovementType } from '../../common/enums';
import { InventoryItem } from './inventory-item.entity';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => InventoryItem, (item) => item.stockMovements, {
    onDelete: 'CASCADE',
  })
  inventoryItem!: InventoryItem;

  @Column({ name: 'movementType', type: 'simple-enum', enum: MovementType })
  type!: MovementType;

  @Column({ type: 'real' })
  quantity!: number;

  @Column({ type: 'real', default: 0 })
  previousQuantity!: number;

  @Column({ type: 'real', default: 0 })
  newQuantity!: number;

  @Column({ name: 'unit', type: 'text', nullable: true })
  unitSnapshot?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ name: 'linkedOrderId', type: 'text', nullable: true })
  reference?: string | null;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
