import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLegacyDebtDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  originalAmount!: number;

  @IsOptional()
  @IsDateString()
  debtDate?: string | null;

  @IsOptional()
  @IsBoolean()
  dateIsUnknown?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  unit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  paperReference?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
