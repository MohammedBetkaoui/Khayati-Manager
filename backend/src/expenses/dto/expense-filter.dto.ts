import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import {
  ExpenseCategory,
  ExpenseSourceType,
  ExpenseStatus,
} from '../../common/enums';
import { enumValueTransform } from '../../workers/dto/normalize-enum-value';

export enum ExpensePeriodFilter {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  PREVIOUS_MONTH = 'previous_month',
  CUSTOM = 'custom',
  ALL = 'all',
}

export enum ExpenseTabFilter {
  ALL = 'all',
  PURCHASES = 'purchases',
  PAYROLL = 'payroll',
  MANUAL = 'manual',
  RECURRING = 'recurring',
  REPORTS = 'reports',
}

export class ExpenseFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(ExpenseTabFilter)
  tab?: ExpenseTabFilter;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(ExpensePeriodFilter)
  period?: ExpensePeriodFilter;

  @IsOptional()
  @Transform(enumValueTransform(ExpenseCategory))
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @Transform(enumValueTransform(ExpenseStatus))
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @Transform(enumValueTransform(ExpenseSourceType))
  @IsEnum(ExpenseSourceType)
  origin?: ExpenseSourceType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
