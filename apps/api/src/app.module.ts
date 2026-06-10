import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PostsModule } from './modules/posts/posts.module';
import { BannersModule } from './modules/banners/banners.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { DatasetsModule } from './modules/datasets/datasets.module';
import { FormsModule } from './modules/forms/forms.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { FeedbacksModule } from './modules/feedbacks/feedbacks.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthController } from './common/health/health.controller';
import { CommonServicesModule } from './common/services/common-services.module';
import { EmailModule } from './modules/email/email.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonServicesModule,
    EmailModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    PostsModule,
    BannersModule,
    FacilitiesModule,
    SchedulesModule,
    DatasetsModule,
    FormsModule,
    SurveysModule,
    FeedbacksModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
