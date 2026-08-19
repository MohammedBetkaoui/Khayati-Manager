import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SalaryType, WorkerRole, WorkerStatus } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class WorkerFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(
    enumValueTransform(WorkerRole, {
      IRONING_MANAGER: WorkerRole.IRONING,
      PACKAGING_MANAGER: WorkerRole.PACKAGING,
    }),
  )
  @IsEnum(WorkerRole)
  role?: WorkerRole;

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
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
