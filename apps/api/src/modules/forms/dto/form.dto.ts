import {
  IsString, IsOptional, IsBoolean, IsEnum, IsArray, IsNumber,
  ValidateNested, IsInt, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFormOptionDto {
  @ApiProperty() @IsString() optionKey!: string;
  @ApiProperty() @IsString() label!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) orderIndex?: number;
}

export class CreateFormQuestionDto {
  @ApiProperty() @IsString() questionKey!: string;
  @ApiProperty() @IsString() label!: string;
  @ApiProperty({ enum: ['likert', 'single', 'multi', 'text', 'textarea', 'number', 'date'] })
  @IsEnum(['likert', 'single', 'multi', 'text', 'textarea', 'number', 'date'])
  type!: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() required?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() scoreWeight?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) orderIndex?: number;

  @ApiPropertyOptional({ type: [CreateFormOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormOptionDto)
  options?: CreateFormOptionDto[];
}

export class CreateFormSectionDto {
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) orderIndex?: number;

  @ApiPropertyOptional({ type: [CreateFormQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormQuestionDto)
  questions?: CreateFormQuestionDto[];
}

export class CreateFormDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() org?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() badge?: string;
  @ApiPropertyOptional() @IsOptional() info?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [CreateFormSectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormSectionDto)
  sections?: CreateFormSectionDto[];
}
