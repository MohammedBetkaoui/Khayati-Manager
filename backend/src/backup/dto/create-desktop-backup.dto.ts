import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDesktopBackupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32767)
  destinationPath!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  appVersion?: string;
}
