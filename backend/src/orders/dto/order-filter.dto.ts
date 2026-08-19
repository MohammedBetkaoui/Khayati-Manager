import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { OrderPriority, OrderStatus } from '../../common/enums';
import { enumValueTransform } from './normalize-enum-value';

export class OrderFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(enumValueTransform(OrderStatus))
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @Transform(enumValueTransform(OrderPriority))
  @IsEnum(OrderPriority)
  priority?: OrderPriority;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn(['orderNumber', 'deliveryDate', 'receivedDate', 'status', 'priority'])
  sortBy?:
    'orderNumber' | 'deliveryDate' | 'receivedDate' | 'status' | 'priority';

  @IsOptional()
  @Transform(({ value }): unknown => {
    const input: unknown = value;
    return typeof input === 'string' ? input.toUpperCase() : input;
  })
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
