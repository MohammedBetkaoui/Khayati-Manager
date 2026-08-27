import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('worker_role_options')
@Index(['normalizedName'], { unique: true })
export class WorkerRoleOption {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  normalizedName!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
