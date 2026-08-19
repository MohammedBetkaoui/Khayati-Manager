import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Worker } from '../../workers/entities/worker.entity';

export enum BonusDeductionType {
  BONUS = 'bonus',
  DEDUCTION = 'deduction',
}

@Entity('bonus_deductions')
export class BonusDeduction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Worker, (worker) => worker.bonusDeductions, {
    onDelete: 'CASCADE',
  })
  worker!: Worker;

  @Column({ type: 'simple-enum', enum: BonusDeductionType })
  type!: BonusDeductionType;

  @Column({ type: 'real' })
  amount!: number;

  @Column()
  reason!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
