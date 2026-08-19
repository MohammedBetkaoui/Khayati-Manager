import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  InventoryCategory,
  StockStatus,
} from '../../common/enums';
import { OrderMaterial } from '../../orders/entities/order-material.entity';
import { MaterialConsumption } from './material-consumption.entity';
import { StockMovement } from './stock-movement.entity';
import { Supplier } from './supplier.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'simple-enum', enum: InventoryCategory })
  category!: InventoryCategory;

  @Column({ type: 'text', nullable: true })
  type?: string | null;

  @Column({ type: 'text', nullable: true })
  color?: string | null;

  @Column({ type: 'real', default: 0 })
  quantity!: number;

  @Column()
  unit!: string;

  @Column({ type: 'real', default: 0 })
  unitPrice!: number;

  @Column({ type: 'text', nullable: true })
  supplier?: string | null;

  @ManyToOne(() => Supplier, (supplierEntity) => supplierEntity.inventoryItems, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'supplierEntityId' })
  supplierEntity?: Supplier | null;

  @Column({ type: 'real', default: 0 })
  minStockAlert!: number;

  @Column({
    type: 'simple-enum',
    enum: StockStatus,
    default: StockStatus.AVAILABLE,
  })
  status!: StockStatus;

  @Column({ name: 'notes', type: 'text', nullable: true })
  description?: string | null;

  @OneToMany(() => StockMovement, (movement) => movement.inventoryItem)
  stockMovements!: StockMovement[];

  @OneToMany(() => MaterialConsumption, (consumption) => consumption.inventoryItem)
  materialConsumptions!: MaterialConsumption[];

  @OneToMany(() => OrderMaterial, (usage) => usage.inventoryItem)
  orderMaterialUsages!: OrderMaterial[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
