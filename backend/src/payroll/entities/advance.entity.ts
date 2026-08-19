import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Worker } from '../../workers/entities/worker.entity';

@Entity('advances')
export class Advance {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Worker, (worker) => worker.advances, {
    onDelete: 'CASCADE',
  })
  worker!: Worker;

  @Column({ type: 'real' })
  amount!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column()
  deductionMethod!: string;

  @Column({ default: false })
  isDeducted!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
