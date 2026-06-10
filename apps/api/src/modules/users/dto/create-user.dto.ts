import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({ enum: ['admin', 'leader', 'office', 'user'] })
  @IsOptional()
  @IsEnum(['admin', 'leader', 'office', 'user'])
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'pending'] })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending'])
  status?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'pending'] })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending'])
  status?: string;

  @ApiPropertyOptional({ enum: ['admin', 'leader', 'office', 'user'] })
  @IsOptional()
  @IsEnum(['admin', 'leader', 'office', 'user'])
  role?: string;
}

export class AssignRoleDto {
  @ApiProperty()
  roleId!: number;
}

export class AssignPermissionsDto {
  @ApiProperty({ type: [String] })
  permissionNames!: string[];
}
