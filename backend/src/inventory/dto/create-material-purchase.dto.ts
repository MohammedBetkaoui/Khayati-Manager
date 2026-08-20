import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { InventoryCategory, PaymentMethod } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class QuickCreateSupplierDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMaterialPurchaseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inventoryItemId?: number;

  @IsString()
  materialName!: string;

  @IsOptional()
  @Transform(enumValueTransform(InventoryCategory))
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;

  @IsOptional()
  @IsString()
  color?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantityPurchased!: number;

  @IsString()
  unit!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @Transform(enumValueTransform(PaymentMethod))
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuickCreateSupplierDto)
  newSupplier?: QuickCreateSupplierDto;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
