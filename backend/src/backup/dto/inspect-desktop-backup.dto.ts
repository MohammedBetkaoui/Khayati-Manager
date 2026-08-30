import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class InspectDesktopBackupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32767)
  filePath!: string;
}
