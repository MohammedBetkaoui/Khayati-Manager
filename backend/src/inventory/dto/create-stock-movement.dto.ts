import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MovementType } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

const movementTypeAliases = {
  ADJUST: MovementType.ADJUSTMENT,
} as const;

export class CreateStockMovementDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  inventoryItemId!: number;

  @Transform(enumValueTransform(MovementType, movementTypeAliases))
  @IsEnum(MovementType)
  type!: MovementType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  performedBy?: string;
}
