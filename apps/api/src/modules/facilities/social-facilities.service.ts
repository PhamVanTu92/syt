import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';
import { ReportsService } from '../reports/reports.service';

export class CreateSocialFacilityDto {
  @IsString() id!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() latitude?: number;
  @IsOptional() longitude?: number;
  @IsOptional() @IsString() description?: string;
}

export class QueryFacilityDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() type?: string;
  @ApiPropertyOptional() @IsOptional() category?: string;
}

@Injectable()
export class SocialFacilitiesService {
  constructor(
    private prisma: PrismaService,
    @Optional() private reportsService?: ReportsService,
  ) {}

  private readonly TYPE_LABELS: Record<string, string> = {
    BV: 'Bệnh viện',
    BT: 'Cơ sở bảo trợ',
    TT: 'Trung tâm',
    CC: 'Chi cục',
    TYT: 'Trạm y tế',
  };

  async findAll(query: QueryFacilityDto) {
    const { skip, take } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = {};
    if (query.search) where['name'] = { contains: query.search, mode: 'insensitive' };
    if (query.type) where['type'] = query.type;
    if (query.category) where['category'] = query.category;

    const [items, total, typeCounts] = await Promise.all([
      this.prisma.socialFacility.findMany({ where: where as Prisma.SocialFacilityWhereInput, skip, take, orderBy: { name: 'asc' } }),
      this.prisma.socialFacility.count({ where: where as Prisma.SocialFacilityWhereInput }),
      this.prisma.socialFacility.groupBy({ by: ['type'], _count: { _all: true } }),
    ]);

    const typeSummary = Object.entries(this.TYPE_LABELS).map(([code, label]) => ({
      type: code,
      label,
      count: typeCounts.find((r) => r.type === code)?._count._all ?? 0,
    }));
    const totalAll = typeCounts.reduce((sum, r) => sum + r._count._all, 0);

    const base = paginatedResponse(items, total, query.page, query.limit);
    return {
      ...base,
      meta: { ...base.meta, type_summary: typeSummary, total_all: totalAll },
    };
  }

  async findAllFlat(limit = 5000) {
    // PERF FIX: hard limit to prevent full table load; default 5000 covers all Vietnam facilities
    return this.prisma.socialFacility.findMany({
      orderBy: { name: 'asc' },
      take: limit,
      select: { id: true, name: true, type: true, category: true, address: true, phone: true },
    });
  }

  async findOne(id: string) {
    const f = await this.prisma.socialFacility.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Cơ sở không tồn tại');
    return f;
  }

  async create(dto: CreateSocialFacilityDto) {
    const result = await this.prisma.socialFacility.create({ data: dto });
    this.reportsService?.invalidateFacilityCache();
    return result;
  }

  async update(id: string, dto: Partial<CreateSocialFacilityDto>) {
    await this.findOne(id);
    const result = await this.prisma.socialFacility.update({ where: { id }, data: dto });
    this.reportsService?.invalidateFacilityCache();
    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.socialFacility.delete({ where: { id } });
    this.reportsService?.invalidateFacilityCache();
    return { message: 'Đã xóa cơ sở' };
  }
}
