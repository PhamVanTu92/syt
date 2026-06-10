import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService, CreatePermissionDto } from './permissions.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('permissions')
  findAll() { return this.permissionsService.findAll(); }

  @Post()
  @RequirePermissions('permissions')
  create(@Body() dto: CreatePermissionDto) { return this.permissionsService.create(dto); }

  @Put(':id')
  @RequirePermissions('permissions')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreatePermissionDto>) {
    return this.permissionsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('permissions')
  remove(@Param('id', ParseIntPipe) id: number) { return this.permissionsService.remove(id); }
}
