import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderStatus } from '../../common/enums';
import { Worker } from '../../workers/entities/worker.entity';
import { Order } from './order.entity';

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.statusHistory, {
    onDelete: 'CASCADE',
  })
  order!: Order;

  @Column({ type: 'simple-enum', enum: OrderStatus })
  status!: OrderStatus;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date!: string;

  @ManyToOne(() => Worker, { nullable: true, onDelete: 'SET NULL' })
  responsible?: Worker;

  @Column({ nullable: true })
  responsibleName?: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
