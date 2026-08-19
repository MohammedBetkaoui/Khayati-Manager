import { PartialType } from '@nestjs/mapped-types';
import { CreateFinishedProductDto } from './create-finished-product.dto';

export class UpdateFinishedProductDto extends PartialType(
  CreateFinishedProductDto,
) {}
