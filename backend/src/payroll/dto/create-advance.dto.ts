import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AdvanceType } from '../../common/enums';

export class CreateAdvanceDto {
  @Type(() => Number) @IsInt() @Min(1) workerId!: number;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsDateString() date!: string;
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsEnum(AdvanceType)
  type?: AdvanceType;
  @IsOptional() @IsString() notes?: string;
}
