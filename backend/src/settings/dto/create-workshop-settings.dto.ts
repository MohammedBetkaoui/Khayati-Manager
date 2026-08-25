import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkshopSettingsDto {
  @IsString()
  @MaxLength(180)
  workshopName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  commercialName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  taxNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  commercialRegister?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  logoPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  stampPath?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  defaultCurrency?: string;

  @IsOptional()
  @IsBoolean()
  defaultTaxEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  defaultTaxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  invoiceFooter?: string;
}
