import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  FinishedProductCategory,
  FinishedProductStatus,
} from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

const booleanTransform = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class FinishedProductFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(enumValueTransform(FinishedProductCategory))
  @IsEnum(FinishedProductCategory)
  category?: FinishedProductCategory;

  @IsOptional()
  @Transform(enumValueTransform(FinishedProductStatus))
  @IsEnum(FinishedProductStatus)
  status?: FinishedProductStatus;

  @IsOptional()
  @Transform(booleanTransform)
  @IsBoolean()
  available?: boolean;

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
  @IsIn(['name', 'sku', 'creationDate', 'quantityAvailable', 'salePrice'])
  sortBy?: 'name' | 'sku' | 'creationDate' | 'quantityAvailable' | 'salePrice';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
