import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CustomerStatus, CustomerType } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

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
  @MaxLength(40)
  secondPhone?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  address?: string;

  @IsOptional()
  @Transform(trimText)
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(100)
  wilaya?: string;

  @IsOptional()
  @Transform(enumValueTransform(CustomerType))
  @IsEnum(CustomerType)
  type?: CustomerType;

  @IsOptional()
  @Transform(enumValueTransform(CustomerStatus))
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

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
