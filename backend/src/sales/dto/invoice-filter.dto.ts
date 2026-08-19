import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentStatus } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

const paymentStatusAliases = {
  PARTIAL: PaymentStatus.PARTIALLY_PAID,
  PARTIALLY_PAID: PaymentStatus.PARTIALLY_PAID,
} as const;

export class InvoiceFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(enumValueTransform(PaymentStatus, paymentStatusAliases))
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @Transform(enumValueTransform(PaymentStatus, paymentStatusAliases))
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
