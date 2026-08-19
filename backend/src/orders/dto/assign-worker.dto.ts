import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { OrderStatus } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class AssignWorkerDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workerId!: number;

  @Transform(enumValueTransform(OrderStatus))
  @IsEnum(OrderStatus)
  stage!: OrderStatus;

  @IsOptional()
  @IsDateString()
  assignedDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  completedPieces?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
