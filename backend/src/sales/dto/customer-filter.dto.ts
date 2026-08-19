import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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
  @IsIn(['fullName', 'lastVisitDate', 'totalPurchases', 'totalDebt'])
  sortBy?: 'fullName' | 'lastVisitDate' | 'totalPurchases' | 'totalDebt';

  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => {
    const input: unknown = value;
    return typeof input === 'string' ? input.toUpperCase() : input;
  })
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
