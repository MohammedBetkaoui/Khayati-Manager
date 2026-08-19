import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { InventoryCategory, StockStatus } from '../../common/enums';

export class CreateInventoryDto {
  @IsString()
  name!: string;

  @IsEnum(InventoryCategory)
  category!: InventoryCategory;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStockAlert?: number;

  @IsOptional()
  @IsEnum(StockStatus)
  status?: StockStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
