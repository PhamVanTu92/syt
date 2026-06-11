import {
  Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  FeedbacksService, CreateFeedbackDto, QueryFeedbackDto, QueryStatsDto,
} from './feedbacks.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UseGuards, Optional } from '@nestjs/common';

@ApiTags('Feedbacks')
@Controller('feedbacks')
export class FeedbacksController {
  constructor(private svc: FeedbacksService) {}

  // Public submit (optional auth — logged in user gets auto-approved)
  @Public()
  @Post()
  create(@Body() dto: CreateFeedbackDto, @CurrentUser('id') userId?: number) {
    return this.svc.create(dto, userId);
  }

  @Get()
  @RequirePermissions('reflect.list_feedback', 'evaluate.list_feedback')
  @ApiBearerAuth()
  findAll(@Query() q: QueryFeedbackDto) { return this.svc.findAll(q); }

  // POST version for long unit_ids arrays
  @Post('list')
  @RequirePermissions('reflect.list_feedback', 'evaluate.list_feedback')
  @ApiBearerAuth()
  findAllPost(@Body() q: QueryFeedbackDto) { return this.svc.findAll(q); }

  @Get('stats')
  @RequirePermissions('reflect.list_feedback', 'evaluate.list_feedback')
  @ApiBearerAuth()
  getStats(@Query() q: QueryStatsDto) { return this.svc.getStats(q); }

  @Post('stats')
  @RequirePermissions('reflect.list_feedback', 'evaluate.list_feedback')
  @ApiBearerAuth()
  getStatsPost(@Body() q: QueryStatsDto) { return this.svc.getStats(q); }

  @Public()
  @Get('check-unit')
  checkUnit(@Query('surveyKey') surveyKey: string, @Query('facilityId') facilityId: string) {
    return this.svc.checkUnit(surveyKey, facilityId);
  }

  @Get('survey/:surveyId/facility-status')
  @RequirePermissions('reflect.list_feedback', 'evaluate.list_feedback')
  @ApiBearerAuth()
  getSurveyFacilityStatus(@Param('surveyId', ParseIntPipe) surveyId: number) {
    return this.svc.getSurveyFacilityStatus(surveyId);
  }

  @Get('evaluate-dashboard')
  @RequirePermissions('reflect.list_feedback', 'evaluate.list_feedback')
  @ApiBearerAuth()
  getEvaluateDashboard(@Query('survey_key') surveyKey?: string) {
    return this.svc.getEvaluateDashboard(surveyKey);
  }

  @Get(':id')
  @RequirePermissions('reflect.list_feedback', 'evaluate.list_feedback')
  @ApiBearerAuth()
  findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Patch(':id/status')
  @RequirePermissions('reflect.list_feedback', 'evaluate.list_feedback')
  @ApiBearerAuth()
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: string) {
    return this.svc.updateStatus(id, status);
  }

  @Delete(':id')
  @RequirePermissions('reflect.list_feedback', 'evaluate.list_feedback')
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
