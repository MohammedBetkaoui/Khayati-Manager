import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAutomaticBackupDto {
  @IsIn([7, 14, 30])
  retention!: 7 | 14 | 30;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  appVersion?: string;
}
