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

export class CreatePaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  invoiceId!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @Transform(enumValueTransform(PaymentMethod))
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

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
