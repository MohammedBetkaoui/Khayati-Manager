import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RestoreDesktopBackupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  filePath!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  appVersion?: string;
}
