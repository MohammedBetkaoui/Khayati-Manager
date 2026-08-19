import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class CreateInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  productType?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateInvoiceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @Transform(enumValueTransform(PaymentMethod))
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
