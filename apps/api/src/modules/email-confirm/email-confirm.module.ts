import { Module } from '@nestjs/common';
import { EmailConfirmController } from './email-confirm.controller';
import { EmailConfirmService } from './email-confirm.service';

@Module({
  controllers: [EmailConfirmController],
  providers: [EmailConfirmService],
})
export class EmailConfirmModule {}
