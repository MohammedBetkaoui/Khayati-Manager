import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceStatus } from '../../common/enums';
import { Worker } from './worker.entity';

@Index(['worker', 'date'], { unique: true })
@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Worker, (worker) => worker.attendances, {
    onDelete: 'CASCADE',
  })
  worker!: Worker;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'simple-enum', enum: AttendanceStatus })
  status!: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  checkIn?: string | null;

  @Column({ type: 'text', nullable: true })
  checkOut?: string | null;

  @Column({ type: 'integer', default: 0 })
  lateMinutes!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
