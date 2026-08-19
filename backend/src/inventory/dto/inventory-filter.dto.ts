import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  InventoryCategory,
  StockStatus,
} from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

const inventoryCategoryAliases = {
  FABRICS: InventoryCategory.FABRIC,
  BUTTONS: InventoryCategory.BUTTON,
  ZIPPERS: InventoryCategory.ZIPPER,
} as const;

const stockStatusAliases = {
  LOW: StockStatus.LOW_STOCK,
} as const;

export class InventoryFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(enumValueTransform(InventoryCategory, inventoryCategoryAliases))
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;

  @IsOptional()
  @Transform(enumValueTransform(StockStatus, stockStatusAliases))
  @IsEnum(StockStatus)
  status?: StockStatus;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
