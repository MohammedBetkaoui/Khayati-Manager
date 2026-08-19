import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductionTaskType } from '../../common/enums';
import { Worker } from './worker.entity';

@Entity('worker_productions')
export class WorkerProduction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Worker, (worker) => worker.productions, {
    onDelete: 'CASCADE',
  })
  worker!: Worker;

  @Column({ type: 'integer', nullable: true })
  orderId?: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'simple-enum', enum: ProductionTaskType })
  taskType!: ProductionTaskType;

  @Column({ type: 'integer', default: 0 })
  piecesCompleted!: number;

  @Column({ type: 'real', default: 0 })
  piecePrice!: number;

  @Column({ type: 'real', default: 0 })
  totalAmount!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
