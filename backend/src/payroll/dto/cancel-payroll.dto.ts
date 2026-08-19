import { IsString, MinLength } from 'class-validator';

export class CancelPayrollDto {
  @IsString() @MinLength(3) reason!: string;
}
