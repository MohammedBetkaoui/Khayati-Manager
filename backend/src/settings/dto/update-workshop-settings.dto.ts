import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkshopSettingsDto } from './create-workshop-settings.dto';

export class UpdateWorkshopSettingsDto extends PartialType(
  CreateWorkshopSettingsDto,
) {}
