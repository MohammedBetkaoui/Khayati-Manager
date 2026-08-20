import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SupplierStatus } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class SupplierFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(enumValueTransform(SupplierStatus))
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

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
  @IsIn(['name', 'totalPurchases', 'totalDebt', 'lastPurchaseDate', 'createdAt'])
  sortBy?: 'name' | 'totalPurchases' | 'totalDebt' | 'lastPurchaseDate' | 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
