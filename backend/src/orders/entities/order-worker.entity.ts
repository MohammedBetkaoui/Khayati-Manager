import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../../common/enums';
import { Worker } from '../../workers/entities/worker.entity';
import { Order } from './order.entity';

@Entity('order_workers')
export class OrderWorker {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.workers, { onDelete: 'CASCADE' })
  order!: Order;

  @ManyToOne(() => Worker, (worker) => worker.orderAssignments, {
    onDelete: 'CASCADE',
  })
  worker!: Worker;

  @Column({ type: 'simple-enum', enum: OrderStatus })
  stage!: OrderStatus;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  assignedDate!: string;

  @Column({ type: 'integer', default: 0 })
  completedPieces!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
