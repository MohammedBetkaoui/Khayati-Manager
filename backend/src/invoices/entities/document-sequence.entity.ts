import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('document_sequences')
@Unique('UQ_document_sequence_type_year', ['documentType', 'year'])
export class DocumentSequence {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 24 })
  documentType!: string;

  @Column({ type: 'integer' })
  year!: number;

  @Column({ type: 'integer', default: 1 })
  nextValue!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
