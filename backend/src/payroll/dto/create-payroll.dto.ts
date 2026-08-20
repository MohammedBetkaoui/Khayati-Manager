import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BalanceDeductionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreatePayrollDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workerId!: number;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  salaryMonth?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  installmentsInMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  installmentNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  piecesCompleted?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  piecePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherDeductions?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  manualGrossAmount?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique((item: BalanceDeductionDto) => item.id)
  @ValidateNested({ each: true })
  @Type(() => BalanceDeductionDto)
  advanceDeductions?: BalanceDeductionDto[];

  @IsOptional()
  @IsArray()
  @ArrayUnique((item: BalanceDeductionDto) => item.id)
  @ValidateNested({ each: true })
  @Type(() => BalanceDeductionDto)
  loanDeductions?: BalanceDeductionDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
