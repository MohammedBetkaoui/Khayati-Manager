import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('workshop_settings')
export class WorkshopSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 180, default: '' })
  workshopName!: string;

  @Column({ type: 'text', nullable: true })
  commercialName?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'text', nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  taxNumber?: string | null;

  @Column({ type: 'text', nullable: true })
  commercialRegister?: string | null;

  @Column({ type: 'text', nullable: true })
  logoPath?: string | null;

  @Column({ type: 'text', nullable: true })
  stampPath?: string | null;

  @Column({ length: 3, default: 'DZD' })
  defaultCurrency!: string;

  @Column({ type: 'boolean', default: false })
  defaultTaxEnabled!: boolean;

  @Column({ type: 'real', default: 0 })
  defaultTaxRate!: number;

  @Column({ type: 'text', nullable: true })
  invoiceFooter?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
