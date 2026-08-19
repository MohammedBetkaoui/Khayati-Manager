import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_notes')
export class CustomerNote {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Customer, (customer) => customer.customerNotes, {
    onDelete: 'CASCADE',
  })
  customer!: Customer;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date!: string;
}
