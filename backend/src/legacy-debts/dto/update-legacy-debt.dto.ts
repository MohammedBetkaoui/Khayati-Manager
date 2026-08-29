import { PartialType } from '@nestjs/mapped-types';
import { CreateLegacyDebtDto } from './create-legacy-debt.dto';

export class UpdateLegacyDebtDto extends PartialType(CreateLegacyDebtDto) {}
