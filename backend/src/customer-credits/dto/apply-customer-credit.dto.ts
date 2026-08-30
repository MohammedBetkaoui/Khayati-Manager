import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CustomerCreditTargetType } from '../../common/enums';
import { enumValueTransform } from '../../common/transforms/enum-value.transform';

export class ApplyCustomerCreditDto {
  @Transform(enumValueTransform(CustomerCreditTargetType))
  @IsEnum(CustomerCreditTargetType)
  targetType!: CustomerCreditTargetType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetId!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UseSaleCustomerCreditDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
