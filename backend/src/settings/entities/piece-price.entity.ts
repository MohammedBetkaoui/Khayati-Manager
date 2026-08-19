import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkerRole } from '../../common/enums';

@Entity('piece_prices')
export class PiecePrice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  productType!: string;

  @Column()
  taskType!: string;

  @Column({ type: 'simple-enum', enum: WorkerRole })
  workerRole!: WorkerRole;

  @Column({ type: 'real' })
  price!: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
