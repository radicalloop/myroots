import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateIf,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Gender } from '../../../types/common.types';
import { IsNotFutureDate } from '../../../common/validators/is-not-future-date.validator';

const emptyToNull = ({ value }: { value: unknown }) =>
  value === '' ? null : value;

export class CreatePersonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name!: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Invalid gender' })
  gender?: Gender;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString({}, { message: 'Invalid birth_date' })
  @IsNotFutureDate({ message: 'Birth date cannot be in the future' })
  birth_date?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString({}, { message: 'Invalid death_date' })
  @IsNotFutureDate({ message: 'Death date cannot be in the future' })
  death_date?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(255)
  birth_place?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(255)
  current_place?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(5000)
  health_note?: string | null;

  @IsBoolean()
  is_root!: boolean;

  @ValidateIf((o: CreatePersonDto) => !o.is_root)
  @Transform(emptyToNull)
  @IsUUID('4', { message: 'parent_id must be a valid UUID' })
  parent_id?: string | null;
}

export class AddParentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name!: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Invalid gender' })
  gender?: Gender;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString({}, { message: 'Invalid birth_date' })
  @IsNotFutureDate({ message: 'Birth date cannot be in the future' })
  birth_date?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString({}, { message: 'Invalid death_date' })
  @IsNotFutureDate({ message: 'Death date cannot be in the future' })
  death_date?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(255)
  birth_place?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(255)
  current_place?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(5000)
  health_note?: string | null;
}

export class UpdatePersonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  @IsNotFutureDate({ message: 'Birth date cannot be in the future' })
  birth_date?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  @IsNotFutureDate({ message: 'Death date cannot be in the future' })
  death_date?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(255)
  birth_place?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(255)
  current_place?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(5000)
  health_note?: string | null;
}

export class ImageUploadDto {
  @IsString()
  content_type!: string;

  @IsOptional()
  file_size?: number;
}

export class ConfirmImageUploadDto {
  @IsString()
  @MinLength(1)
  object_path!: string;
}

export class AddSpouseDto {
  @ValidateIf((o: AddSpouseDto) => !o.existing_person_id)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name?: string;

  @ValidateIf((o: AddSpouseDto) => !o.existing_person_id)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Invalid gender' })
  gender?: Gender;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString({}, { message: 'Invalid birth_date' })
  @IsNotFutureDate({ message: 'Birth date cannot be in the future' })
  birth_date?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString({}, { message: 'Invalid death_date' })
  @IsNotFutureDate({ message: 'Death date cannot be in the future' })
  death_date?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(255)
  birth_place?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(255)
  current_place?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(5000)
  health_note?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID('4', { message: 'existing_person_id must be a valid UUID' })
  existing_person_id?: string | null;
}
