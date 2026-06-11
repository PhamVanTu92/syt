import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class DatasetsService {
  constructor(private prisma: PrismaService) {}

  async findAllTypes() {
    const types = await this.prisma.datasetType.findMany({ orderBy: { name: 'asc' } });
    if (types.length === 0) return types;

    const counts = await this.prisma.datasetRecord.groupBy({
      by: ['datasetTypeId'],
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.datasetTypeId, c._count._all]));

    return types.map((t) => ({ ...t, total_records: countMap.get(t.id) ?? 0 }));
  }

  async findRecords(code: string, query: PaginationDto) {
    const type = await this.prisma.datasetType.findUnique({ where: { code } });
    if (!type) throw new NotFoundException(`Dataset '${code}' không tồn tại`);

    const { skip, take } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = { datasetTypeId: type.id };

    const orderBy: Record<string, string> = {};
    if (query.sort_by && query.sort_dir) {
      orderBy[query.sort_by] = query.sort_dir.toLowerCase();
    } else {
      orderBy['id'] = 'asc';
    }

    const [items, total, allTypeCounts] = await Promise.all([
      this.prisma.datasetRecord.findMany({ where: where as Prisma.DatasetRecordWhereInput, skip, take, orderBy: orderBy as Prisma.DatasetRecordOrderByWithRelationInput }),
      this.prisma.datasetRecord.count({ where: where as Prisma.DatasetRecordWhereInput }),
      this.prisma.datasetRecord.groupBy({ by: ['datasetTypeId'], _count: { _all: true } }),
    ]);

    const allTypes = await this.prisma.datasetType.findMany({ orderBy: { name: 'asc' } });
    const countMap = new Map(allTypeCounts.map((c) => [c.datasetTypeId, c._count._all]));
    const dataset_summary = allTypes.map((t) => ({
      code: t.code,
      name: t.name,
      count: countMap.get(t.id) ?? 0,
    }));
    const total_all = allTypeCounts.reduce((sum, c) => sum + c._count._all, 0);

    const base = paginatedResponse(items, total, query.page, query.limit);
    return {
      ...base,
      meta: { ...base.meta, dataset_summary, total_all },
      type,
    };
  }
}
