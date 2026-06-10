import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/form.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class QueryFormDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
  @ApiPropertyOptional() @IsOptional() type?: string;
}

@ApiTags('Forms')
@Controller('forms')
export class FormsController {
  constructor(private svc: FormsService) {}

  @Public()
  @Get()
  findAll(@Query() q: QueryFormDto) { return this.svc.findAll(q); }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Public()
  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getStats(id, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Post()
  @RequirePermissions('reflect.form.create', 'evaluate.form.create')
  @ApiBearerAuth()
  create(@Body() dto: CreateFormDto) { return this.svc.create(dto); }

  @Put(':id')
  @RequirePermissions('reflect.form.update', 'evaluate.form.update')
  @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateFormDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('reflect.form.delete', 'evaluate.form.delete')
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
