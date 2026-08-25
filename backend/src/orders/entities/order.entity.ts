import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SalesOrderStatus } from '../../common/enums';
import { Customer } from '../../sales/entities/customer.entity';
import { Invoice } from '../../sales/entities/invoice.entity';
import { OrderItem } from './order-item.entity';

@Entity('sales_orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 32 })
  orderNumber!: string;

  @ManyToOne(() => Customer, (customer) => customer.orders, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  customer!: Customer;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  orderDate!: string;

  @Column({ type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({
    type: 'simple-enum',
    enum: SalesOrderStatus,
    default: SalesOrderStatus.DRAFT,
  })
  status!: SalesOrderStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
  })
  items!: OrderItem[];

  @OneToOne(() => Invoice, (invoice) => invoice.order)
  invoice?: Invoice | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
