import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductionTaskType } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class CreateProductionDto {
  @IsDateString()
  date!: string;

  @Transform(enumValueTransform(ProductionTaskType))
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
