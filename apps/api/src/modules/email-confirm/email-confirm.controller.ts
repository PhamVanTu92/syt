import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmailConfirmService } from './email-confirm.service';

@ApiTags('email-confirm')
@ApiBearerAuth()
@Controller('email-confirm')
export class EmailConfirmController {
  constructor(private readonly service: EmailConfirmService) {}

  @Get()
  find() { return this.service.find(); }

  @Put()
  update(@Body() body: any) { return this.service.update(body); }
}
