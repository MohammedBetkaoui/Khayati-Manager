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

export class ChangeOrderStatusDto {
  @Transform(enumValueTransform(OrderStatus))
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workerId?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
