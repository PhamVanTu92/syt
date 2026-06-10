import { Module, forwardRef } from '@nestjs/common';
import {
  SocialFacilitiesController,
  AffiliatedFacilitiesController,
  TradingFacilitiesController,
} from './facilities.controller';
import { SocialFacilitiesService } from './social-facilities.service';
import { AffiliatedFacilitiesService } from './affiliated-facilities.service';
import { TradingFacilitiesService } from './trading-facilities.service';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [forwardRef(() => ReportsModule)],
  controllers: [SocialFacilitiesController, AffiliatedFacilitiesController, TradingFacilitiesController],
  providers: [SocialFacilitiesService, AffiliatedFacilitiesService, TradingFacilitiesService],
  exports: [SocialFacilitiesService],
})
export class FacilitiesModule {}
