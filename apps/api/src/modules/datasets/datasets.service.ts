import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class DatasetsService {
  constructor(private prisma: PrismaService) {}

  findAllTypes() { return this.prisma.datasetType.findMany({ orderBy: { name: 'asc' } }); }

  async findRecords(code: string, query: PaginationDto) {
    const type = await this.prisma.datasetType.findUnique({ where: { code } });
    if (!type) throw new NotFoundException(`Dataset '${code}' không tồn tại`);

    const { skip, take } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = { datasetTypeId: type.id };

    const [items, total] = await Promise.all([
      this.prisma.datasetRecord.findMany({ where, skip, take, orderBy: { id: 'asc' } }),
      this.prisma.datasetRecord.count({ where }),
    ]);
    return { ...paginatedResponse(items, total, query.page, query.limit), type };
  }
}
