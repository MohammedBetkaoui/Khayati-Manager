import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SalaryType, WorkerStatus } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class WorkerFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  role?: string;

  @IsOptional()
  @Transform(
    enumValueTransform(SalaryType, {
      PIECE_BASED: SalaryType.PIECE,
    }),
  )
  @IsEnum(SalaryType)
  salaryType?: SalaryType;

  @IsOptional()
  @Transform(
    enumValueTransform(WorkerStatus, {
      LEAVE: WorkerStatus.VACATION,
    }),
  )
  @IsEnum(WorkerStatus)
  status?: WorkerStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  includeArchived?: boolean;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
