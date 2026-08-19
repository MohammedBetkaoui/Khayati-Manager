import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { Order } from './order.entity';

@Entity('order_materials')
export class OrderMaterial {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.materials, {
    onDelete: 'CASCADE',
  })
  order!: Order;

  @ManyToOne(() => InventoryItem, (item) => item.orderMaterialUsages, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  inventoryItem?: InventoryItem;

  @Column()
  materialName!: string;

  @Column({ type: 'real' })
  quantityUsed!: number;

  @Column()
  unit!: string;

  @Column({ type: 'real', default: 0 })
  unitCost!: number;

  @Column({ type: 'real', default: 0 })
  totalCost!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
