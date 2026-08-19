import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateProductionMaterialDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inventoryItemId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantityUsed!: number;
}

export class CreateProductionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityProduced!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalCost?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateProductionMaterialDto)
  materials?: CreateProductionMaterialDto[];
}
