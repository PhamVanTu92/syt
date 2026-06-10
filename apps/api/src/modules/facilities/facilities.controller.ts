import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import {
  SocialFacilitiesService, CreateSocialFacilityDto, QueryFacilityDto,
} from './social-facilities.service';
import {
  AffiliatedFacilitiesService, CreateAffiliatedFacilityDto,
} from './affiliated-facilities.service';
import {
  TradingFacilitiesService, CreateTradingFacilityDto, QueryTradingDto,
} from './trading-facilities.service';

@ApiTags('Social Facilities')
@Controller('social-facilities')
export class SocialFacilitiesController {
  constructor(private svc: SocialFacilitiesService) {}

  @Public() @Get() findAll(@Query() q: QueryFacilityDto) { return this.svc.findAll(q); }
  @Public() @Get('all') findAllFlat() { return this.svc.findAllFlat(); }
  @Public() @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @RequirePermissions('social_facilities')
  @ApiBearerAuth()
  create(@Body() dto: CreateSocialFacilityDto) { return this.svc.create(dto); }

  @Put(':id')
  @RequirePermissions('social_facilities')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateSocialFacilityDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('social_facilities')
  @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@ApiTags('Affiliated Facilities')
@Controller('affiliated-facilities')
export class AffiliatedFacilitiesController {
  constructor(private svc: AffiliatedFacilitiesService) {}

  @Public() @Get() findAll() { return this.svc.findAll(); }
  @Public() @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Post()
  @RequirePermissions('affiliated_facility')
  @ApiBearerAuth()
  create(@Body() dto: CreateAffiliatedFacilityDto) { return this.svc.create(dto); }

  @Put(':id')
  @RequirePermissions('affiliated_facility')
  @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateAffiliatedFacilityDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('affiliated_facility')
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}

@ApiTags('Trading Facilities')
@Controller('trading-facilities')
export class TradingFacilitiesController {
  constructor(private svc: TradingFacilitiesService) {}

  @Public() @Get() findAll(@Query() q: QueryTradingDto) { return this.svc.findAll(q); }
  @Public() @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Post()
  @RequirePermissions('trading_facility')
  @ApiBearerAuth()
  create(@Body() dto: CreateTradingFacilityDto) { return this.svc.create(dto); }

  @Put(':id')
  @RequirePermissions('trading_facility')
  @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateTradingFacilityDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('trading_facility')
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
