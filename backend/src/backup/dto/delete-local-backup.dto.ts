import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteLocalBackupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32767)
  filePath!: string;
}
