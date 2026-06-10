import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DatasetsService } from './datasets.service';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Datasets')
@Controller('datasets')
export class DatasetsController {
  constructor(private svc: DatasetsService) {}

  @Public() @Get() findAll() { return this.svc.findAllTypes(); }
  @Public() @Get(':code/records') findRecords(@Param('code') code: string, @Query() q: PaginationDto) {
    return this.svc.findRecords(code, q);
  }
}
