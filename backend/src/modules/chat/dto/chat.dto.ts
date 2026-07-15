import { IsString, IsOptional, MinLength, MaxLength, ValidateNested, IsArray, IsIn, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

class ChatImageDto {
  @IsString()
  @MinLength(1)
  data!: string;

  @IsString()
  content_type!: string;
}

class PreviousMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  content!: string;
}

export class ChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  message!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChatImageDto)
  image?: ChatImageDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(50)
  @Type(() => PreviousMessageDto)
  previousMessages?: PreviousMessageDto[];
}
