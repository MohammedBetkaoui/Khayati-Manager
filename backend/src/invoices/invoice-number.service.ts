import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

const INVOICE_DOCUMENT_TYPE = 'INVOICE';

@Injectable()
export class InvoiceNumberService {
  async next(manager: EntityManager, issueDate: string) {
    const year = this.getYear(issueDate);
    const rows = (await manager.query(
      `INSERT INTO document_sequences
         (documentType, year, nextValue, createdAt, updatedAt)
       VALUES (?, ?, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(documentType, year) DO UPDATE SET
         nextValue = nextValue + 1,
         updatedAt = CURRENT_TIMESTAMP
       RETURNING nextValue - 1 AS value`,
      [INVOICE_DOCUMENT_TYPE, year],
    )) as Array<{ value: number }>;
    const value = Number(rows[0]?.value);
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('Unable to allocate the next invoice number');
    }

    return `INV-${year}-${String(value).padStart(4, '0')}`;
  }

  private getYear(issueDate: string) {
    const year = Number(issueDate.slice(0, 4));
    if (!Number.isInteger(year) || year < 2000 || year > 9999) {
      throw new BadRequestException(`Invalid invoice issue date: ${issueDate}`);
    }
    return year;
  }
}
