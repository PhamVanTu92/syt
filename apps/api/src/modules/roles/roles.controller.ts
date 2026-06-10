import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService, CreateRoleDto, AssignPermissionsToRoleDto } from './roles.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles')
  @ApiOperation({ summary: 'Danh sách vai trò' })
  findAll() { return this.rolesService.findAll(); }

  @Get(':id')
  @RequirePermissions('roles')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.rolesService.findOne(id); }

  @Post()
  @RequirePermissions('roles')
  create(@Body() dto: CreateRoleDto) { return this.rolesService.create(dto); }

  @Put(':id')
  @RequirePermissions('roles')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateRoleDto>) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('roles')
  remove(@Param('id', ParseIntPipe) id: number) { return this.rolesService.remove(id); }

  @Post(':id/permissions')
  @RequirePermissions('roles')
  @ApiOperation({ summary: 'Gán quyền cho vai trò' })
  assignPermissions(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignPermissionsToRoleDto) {
    return this.rolesService.assignPermissions(id, dto.permissionIds);
  }
}
