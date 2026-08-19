import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  InventoryCategory,
  StockStatus,
} from '../../common/enums';
import { OrderMaterial } from '../../orders/entities/order-material.entity';
import { StockMovement } from './stock-movement.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'simple-enum', enum: InventoryCategory })
  category!: InventoryCategory;

  @Column({ nullable: true })
  color?: string;

  @Column({ nullable: true })
  type?: string;

  @Column({ type: 'real', default: 0 })
  quantity!: number;

  @Column()
  unit!: string;

  @Column({ type: 'real', default: 0 })
  unitPrice!: number;

  @Column({ nullable: true })
  supplier?: string;

  @Column({ type: 'real', default: 0 })
  minStockAlert!: number;

  @Column({
    type: 'simple-enum',
    enum: StockStatus,
    default: StockStatus.AVAILABLE,
  })
  status!: StockStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => StockMovement, (movement) => movement.inventoryItem)
  stockMovements!: StockMovement[];

  @OneToMany(() => OrderMaterial, (usage) => usage.inventoryItem)
  orderMaterialUsages!: OrderMaterial[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
