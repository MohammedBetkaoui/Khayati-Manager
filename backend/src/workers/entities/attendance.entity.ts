import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceStatus } from '../../common/enums';
import { Worker } from './worker.entity';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'simple-enum', enum: AttendanceStatus })
  status!: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  checkInTime?: string;

  @Column({ type: 'text', nullable: true })
  checkOutTime?: string;

  @Column({ type: 'integer', default: 0 })
  lateMinutes!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => Worker, (worker) => worker.attendances, {
    onDelete: 'CASCADE',
  })
  worker!: Worker;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
