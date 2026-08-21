import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplierAdvanceStatus } from '../../common/enums';
import { Supplier } from './supplier.entity';

@Entity('supplier_advances')
export class SupplierAdvance {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.advances, {
    onDelete: 'RESTRICT',
  })
  supplier!: Supplier;

  @Column({ type: 'real' })
  amount!: number;

  @Column({ type: 'real', default: 0 })
  appliedAmount!: number;

  @Column({ type: 'real', default: 0 })
  remainingAmount!: number;

  @Column({ type: 'real', nullable: true })
  debtBefore?: number | null;

  @Column({ type: 'real', nullable: true })
  debtAfter?: number | null;

  @Column({
    type: 'simple-enum',
    enum: SupplierAdvanceStatus,
    default: SupplierAdvanceStatus.OPEN,
  })
  status!: SupplierAdvanceStatus;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
