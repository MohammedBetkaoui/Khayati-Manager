import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CustomerStatus, CustomerType } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class CustomerFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Transform(enumValueTransform(CustomerType))
  @IsEnum(CustomerType)
  type?: CustomerType;

  @IsOptional()
  @Transform(enumValueTransform(CustomerStatus))
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn([
    'fullName',
    'lastVisitDate',
    'totalPurchases',
    'totalDebt',
    'createdAt',
  ])
  sortBy?:
    'fullName' | 'lastVisitDate' | 'totalPurchases' | 'totalDebt' | 'createdAt';

  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => {
    const input: unknown = value;
    return typeof input === 'string' ? input.toUpperCase() : input;
  })
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
