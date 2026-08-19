import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_measurements')
export class CustomerMeasurement {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Customer, (customer) => customer.measurements, {
    onDelete: 'CASCADE',
  })
  customer!: Customer;

  @Column()
  type!: string;

  @Column({ type: 'real', nullable: true })
  height?: number;

  @Column({ type: 'real', nullable: true })
  shoulder?: number;

  @Column({ type: 'real', nullable: true })
  chest?: number;

  @Column({ type: 'real', nullable: true })
  waist?: number;

  @Column({ type: 'real', nullable: true })
  sleeve?: number;

  @Column({ type: 'real', nullable: true })
  pantsLength?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date!: string;
}
