import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SalaryType, WorkerRole, WorkerStatus } from '../../common/enums';

export class CreateWorkerDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(WorkerRole)
  role!: WorkerRole;

  @IsEnum(SalaryType)
  salaryType!: SalaryType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryValue?: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsEnum(WorkerStatus)
  status?: WorkerStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
