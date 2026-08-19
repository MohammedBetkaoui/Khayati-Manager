import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StockMovementType } from '../../common/enums';
import { InventoryItem } from './inventory-item.entity';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => InventoryItem, (item) => item.stockMovements, {
    onDelete: 'CASCADE',
  })
  inventoryItem!: InventoryItem;

  @Column({ type: 'simple-enum', enum: StockMovementType })
  movementType!: StockMovementType;

  @Column({ type: 'real' })
  quantity!: number;

  @Column()
  unit!: string;

  @Column({ nullable: true })
  reason?: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ nullable: true })
  linkedOrderId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
