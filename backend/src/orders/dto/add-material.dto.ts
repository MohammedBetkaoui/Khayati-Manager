import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddMaterialDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inventoryItemId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantityUsed!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
