import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AttendanceStatus } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class CreateAttendanceDto {
  @IsDateString()
  date!: string;

  @Transform(enumValueTransform(AttendanceStatus))
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  checkIn?: string;

  @IsOptional()
  @IsString()
  checkOut?: string;

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
