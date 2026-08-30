import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums';
import { enumValueTransform } from '../../common/transforms/enum-value.transform';

const cashPaymentMethods = [
  PaymentMethod.CASH,
  PaymentMethod.TRANSFER,
  PaymentMethod.CHECK,
  PaymentMethod.OTHER,
] as const;

export class CreateCreditAdvanceDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @Transform(enumValueTransform(PaymentMethod))
  @IsIn(cashPaymentMethods)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
