import {
  Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  SchedulesService, CreateScheduleDto, QueryScheduleDto, ApproveScheduleDto,
} from './schedules.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private svc: SchedulesService) {}

  @Public() @Get() findAll(@Query() q: QueryScheduleDto) { return this.svc.findAll(q); }
  @Public() @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Post()
  @RequirePermissions('work_schedule.create')
  @ApiBearerAuth()
  create(@Body() dto: CreateScheduleDto, @CurrentUser('id') userId: number) {
    return this.svc.create(dto, userId);
  }

  @Put(':id')
  @RequirePermissions('work_schedule.update')
  @ApiBearerAuth()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateScheduleDto>,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.update(id, dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('work_schedule.delete')
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.svc.remove(id, userId);
  }

  @Patch(':id/approve')
  @RequirePermissions('work_schedule.approve')
  @ApiBearerAuth()
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveScheduleDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.svc.approve(id, dto, userId);
  }
}
