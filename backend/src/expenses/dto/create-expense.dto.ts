import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  ExpenseCategory,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
  RecurringFrequency,
} from '../../common/enums';
import { enumValueTransform } from '../../workers/dto/normalize-enum-value';

export class CreateExpenseDto {
  @Transform(enumValueTransform(ExpenseCategory))
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsString()
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @Transform(enumValueTransform(PaymentMethod))
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @Transform(enumValueTransform(ExpenseStatus))
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @Transform(enumValueTransform(ExpenseType))
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @Transform(enumValueTransform(RecurringFrequency))
  @IsEnum(RecurringFrequency)
  frequency?: RecurringFrequency;

  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
