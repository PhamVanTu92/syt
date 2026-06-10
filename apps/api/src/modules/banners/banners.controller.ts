import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BannersService, CreateBannerDto } from './banners.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private bannersService: BannersService) {}

  @Public()
  @Get()
  findAll(@Query('position') position?: string) {
    return this.bannersService.findAll(position);
  }

  @Get('admin')
  @RequirePermissions('banners')
  @ApiBearerAuth()
  findAllAdmin() { return this.bannersService.findAllAdmin(); }

  @Post()
  @RequirePermissions('banners')
  @ApiBearerAuth()
  create(@Body() dto: CreateBannerDto) { return this.bannersService.create(dto); }

  @Put('reorder')
  @RequirePermissions('banners')
  @ApiBearerAuth()
  reorder(@Body('ids') ids: number[]) { return this.bannersService.reorder(ids); }

  @Put(':id')
  @RequirePermissions('banners')
  @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateBannerDto>) {
    return this.bannersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('banners')
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number) { return this.bannersService.remove(id); }
}
