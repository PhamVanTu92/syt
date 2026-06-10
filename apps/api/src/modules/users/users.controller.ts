import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CreateUserDto, UpdateUserDto, AssignRoleDto, AssignPermissionsDto,
} from './dto/create-user.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Danh sách người dùng' })
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query);
  }

  @Get('leaders')
  @ApiOperation({ summary: 'Danh sách lãnh đạo' })
  getLeaders() {
    return this.usersService.getLeaders();
  }

  @Get(':id')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Chi tiết người dùng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Tạo người dùng' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Cập nhật người dùng' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Xóa người dùng' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') requesterId: number) {
    return this.usersService.remove(id, requesterId);
  }

  @Post(':id/roles')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Gán vai trò cho người dùng' })
  assignRole(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto.roleId);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Gỡ vai trò khỏi người dùng' })
  removeRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.usersService.removeRole(id, roleId);
  }

  @Post(':id/permissions')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Gán quyền cho người dùng' })
  assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.usersService.assignPermissions(id, dto.permissionNames);
  }
}
