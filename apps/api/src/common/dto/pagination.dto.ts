import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC', 'asc', 'desc'] })
  @IsOptional()
  @IsString()
  sort_dir?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  survey_key?: string;
}

export function paginate(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
