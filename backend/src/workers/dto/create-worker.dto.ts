import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SalaryType, WorkerRole, WorkerStatus } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class CreateWorkerDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @Transform(
    enumValueTransform(WorkerRole, {
      IRONING_MANAGER: WorkerRole.IRONING,
      PACKAGING_MANAGER: WorkerRole.PACKAGING,
    }),
  )
  @IsEnum(WorkerRole)
  role!: WorkerRole;

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
