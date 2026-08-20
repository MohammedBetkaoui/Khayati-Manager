import { Equals, IsBoolean, IsString, MinLength } from 'class-validator';

export class DeletePayrollDto {
  @IsString()
  @MinLength(1)
  confirmation!: string;

  @IsBoolean()
  @Equals(true)
  acknowledgePermanentDeletion!: boolean;
}
