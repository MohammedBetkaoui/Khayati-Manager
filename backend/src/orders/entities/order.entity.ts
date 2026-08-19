import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderPriority, OrderStatus } from '../../common/enums';
import { Customer } from '../../sales/entities/customer.entity';
import { Invoice } from '../../sales/entities/invoice.entity';
import { OrderMaterial } from './order-material.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { OrderWorker } from './order-worker.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  orderNumber!: string;

  @ManyToOne(() => Customer, (customer) => customer.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  customer?: Customer;

  @Column({ nullable: true })
  customerName?: string;

  @Column({ nullable: true })
  customerPhone?: string;

  @Column()
  productType!: string;

  @Column({ type: 'integer', default: 1 })
  quantity!: number;

  @Column({ type: 'text', nullable: true })
  sizes?: string;

  @Column({ type: 'text', nullable: true })
  colors?: string;

  @Column({
    type: 'simple-enum',
    enum: OrderStatus,
    default: OrderStatus.NEW,
  })
  status!: OrderStatus;

  @Column({
    type: 'simple-enum',
    enum: OrderPriority,
    default: OrderPriority.NORMAL,
  })
  priority!: OrderPriority;

  @Column({ type: 'date' })
  receivedDate!: string;

  @Column({ type: 'date', nullable: true })
  deliveryDate?: string;

  @Column({ type: 'real', default: 0 })
  estimatedCost!: number;

  @Column({ type: 'real', default: 0 })
  finalPrice!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => OrderWorker, (assignment) => assignment.order)
  workers!: OrderWorker[];

  @OneToMany(() => OrderMaterial, (material) => material.order)
  materials!: OrderMaterial[];

  @OneToMany(() => OrderStatusHistory, (history) => history.order)
  statusHistory!: OrderStatusHistory[];

  @OneToMany(() => Invoice, (invoice) => invoice.order)
  invoices!: Invoice[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
