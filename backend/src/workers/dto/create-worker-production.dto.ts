import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductionTaskType } from '../../common/enums';

export class CreateWorkerProductionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  orderId?: number;

  @IsDateString()
  date!: string;

  @IsEnum(ProductionTaskType)
  taskType!: ProductionTaskType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  piecesCompleted!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  piecePrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
