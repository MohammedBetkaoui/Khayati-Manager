import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SalaryType, WorkerStatus } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class CreateWorkerDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  role!: string;

  @Transform(
    enumValueTransform(SalaryType, {
      PIECE_BASED: SalaryType.PIECE,
    }),
  )
  @IsEnum(SalaryType)
  salaryType!: SalaryType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlySalary?: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @Transform(
    enumValueTransform(WorkerStatus, {
      LEAVE: WorkerStatus.VACATION,
    }),
  )
  @IsEnum(WorkerStatus)
  status?: WorkerStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
