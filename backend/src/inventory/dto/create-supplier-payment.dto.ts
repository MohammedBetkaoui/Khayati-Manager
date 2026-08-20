import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class CreateSupplierPaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  purchaseId?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @Transform(enumValueTransform(PaymentMethod))
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
