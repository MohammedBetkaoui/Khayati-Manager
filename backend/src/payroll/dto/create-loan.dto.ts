import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLoanDto {
  @Type(() => Number) @IsInt() @Min(1) workerId!: number;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsDateString() date!: string;
  @IsOptional() @IsString() notes?: string;
}
