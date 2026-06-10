import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SurveysService, CreateSurveyDto, QuerySurveyDto } from './surveys.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Surveys')
@Controller('surveys')
export class SurveysController {
  constructor(private svc: SurveysService) {}

  @Public() @Get() findAll(@Query() q: QuerySurveyDto) { return this.svc.findAll(q); }
  @Public() @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Post()
  @RequirePermissions('reflect.survey', 'evaluate.survey')
  @ApiBearerAuth()
  create(@Body() dto: CreateSurveyDto) { return this.svc.create(dto); }

  @Put(':id')
  @RequirePermissions('reflect.survey', 'evaluate.survey')
  @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateSurveyDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('reflect.survey', 'evaluate.survey')
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }

  @Get(':id/facilities')
  @Public()
  getFacilities(@Param('id', ParseIntPipe) id: number) { return this.svc.getFacilities(id); }

  @Post(':id/facilities')
  @RequirePermissions('reflect.survey', 'evaluate.survey')
  @ApiBearerAuth()
  setFacilities(@Param('id', ParseIntPipe) id: number, @Body('facilityIds') ids: string[]) {
    return this.svc.setFacilities(id, ids);
  }

  @Post(':id/facilities/:fId')
  @RequirePermissions('reflect.survey', 'evaluate.survey')
  @ApiBearerAuth()
  addFacility(@Param('id', ParseIntPipe) id: number, @Param('fId') fId: string) {
    return this.svc.addFacility(id, fId);
  }

  @Delete(':id/facilities/:fId')
  @RequirePermissions('reflect.survey', 'evaluate.survey')
  @ApiBearerAuth()
  removeFacility(@Param('id', ParseIntPipe) id: number, @Param('fId') fId: string) {
    return this.svc.removeFacility(id, fId);
  }
}
