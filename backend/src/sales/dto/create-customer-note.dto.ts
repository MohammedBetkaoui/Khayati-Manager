import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCustomerNoteDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
