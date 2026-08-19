import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { InventoryCategory } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

const inventoryCategoryAliases = {
  FABRICS: InventoryCategory.FABRIC,
  BUTTONS: InventoryCategory.BUTTON,
  ZIPPERS: InventoryCategory.ZIPPER,
} as const;

export class CreateInventoryItemDto {
  @IsString()
  name!: string;

  @Transform(enumValueTransform(InventoryCategory, inventoryCategoryAliases))
  @IsEnum(InventoryCategory)
  category!: InventoryCategory;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  unit!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  supplierId?: number;

  @IsOptional()
  @IsString()
  supplier?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStockAlert!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
