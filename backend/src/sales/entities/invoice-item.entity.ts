import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, {
    onDelete: 'CASCADE',
  })
  invoice!: Invoice;

  @Column()
  description!: string;

  @Column({ nullable: true })
  productType?: string;

  @Column({ type: 'real', default: 1 })
  quantity!: number;

  @Column({ type: 'real', default: 0 })
  unitPrice!: number;

  @Column({ type: 'real', default: 0 })
  total!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
