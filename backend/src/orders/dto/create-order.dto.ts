import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { OrderPriority } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId!: number;

  @IsString()
  @IsNotEmpty()
  productType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  colors?: string;

  @IsOptional()
  @IsString()
  sizes?: string;

  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @IsDateString()
  deliveryDate!: string;

  @IsOptional()
  @Transform(enumValueTransform(OrderPriority))
  @IsEnum(OrderPriority)
  priority?: OrderPriority;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finalPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
