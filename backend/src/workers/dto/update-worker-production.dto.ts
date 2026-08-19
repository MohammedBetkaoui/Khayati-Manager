import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkerProductionDto } from './create-worker-production.dto';

export class UpdateWorkerProductionDto extends PartialType(CreateWorkerProductionDto) {}
