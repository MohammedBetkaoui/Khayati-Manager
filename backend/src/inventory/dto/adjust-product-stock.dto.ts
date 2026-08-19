import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductStockMovementType } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class AdjustProductStockDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId?: number;

  @Transform(enumValueTransform(ProductStockMovementType))
  @IsEnum(ProductStockMovementType)
  type!: ProductStockMovementType;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
