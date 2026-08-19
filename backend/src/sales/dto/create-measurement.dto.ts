import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMeasurementDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId?: number;

  @IsString()
  type!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  height?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shoulder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chest?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  waist?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sleeve?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pantsLength?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
