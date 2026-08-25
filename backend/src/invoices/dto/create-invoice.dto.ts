import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DiscountType, InvoiceStatus } from '../../common/enums';
import { enumValueTransform } from '../../common/transforms/enum-value.transform';
import { CreateInvoicePaymentDto } from './create-invoice-payment.dto';
import { InvoiceLineDto } from './invoice-line.dto';

export class CreateInvoiceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  items!: InvoiceLineDto[];

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Transform(enumValueTransform(DiscountType))
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsBoolean()
  taxEnabled?: boolean;

  @ValidateIf((dto: CreateInvoiceDto) => dto.taxEnabled === true)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @Transform(enumValueTransform(InvoiceStatus))
  @IsEnum(InvoiceStatus)
  invoiceStatus?: InvoiceStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInvoicePaymentDto)
  initialPayment?: CreateInvoicePaymentDto;
}
