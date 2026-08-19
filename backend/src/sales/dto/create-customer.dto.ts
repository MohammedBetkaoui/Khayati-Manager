import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCustomerDto {
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName!: string;

  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  address?: string;

  @IsOptional()
  @Transform(trimText)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  firstVisitDate?: string;

  @IsOptional()
  @IsDateString()
  lastVisitDate?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  notes?: string;
}
