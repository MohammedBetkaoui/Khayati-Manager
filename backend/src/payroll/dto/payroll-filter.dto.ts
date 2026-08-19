import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PayrollStatus, SalaryType } from '../../common/enums';
import { enumValueTransform } from '../../workers/dto/normalize-enum-value';

export class PayrollFilterDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) workerId?: number;
  @IsOptional() @Transform(enumValueTransform(SalaryType)) @IsEnum(SalaryType) salaryType?: SalaryType;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value) @IsEnum(PayrollStatus) status?: PayrollStatus;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
