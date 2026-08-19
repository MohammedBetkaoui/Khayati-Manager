import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AttendanceStatus } from '../../common/enums';

export class CreateAttendanceDto {
  @IsDateString()
  date!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lateMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
