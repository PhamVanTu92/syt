import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IsString, IsOptional, IsEnum, IsInt, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';
import { extractFacilityFromInfo } from './utils/feedback-parser.util';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CreateFeedbackOptionDto {
  @IsOptional() @IsInt() tiendo?: number;
  @IsOptional() @IsInt() danhgia?: number;
  @IsOptional() @IsString() ghichu?: string;
  @IsOptional() data?: Record<string, unknown>;
}

export class CreateFeedbackSectionDto {
  @IsString() name!: string;
  @IsOptional() data?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFeedbackOptionDto)
  options?: CreateFeedbackOptionDto[];
}

export class CreateFeedbackDto {
  @IsInt() formId!: number;
  @IsOptional() @IsString() creatorName?: string;
  @IsOptional() @IsString() surveyKey?: string;
  @IsOptional() @IsEnum(['reflect', 'evaluate']) type?: string;
  @IsOptional() @IsEnum(['qr', 'web']) source?: string;
  @IsOptional() info?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFeedbackSectionDto)
  sections?: CreateFeedbackSectionDto[];
}

export class QueryFeedbackDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() type?: string;
  @ApiPropertyOptional() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsOptional() surveyKey?: string;
  @ApiPropertyOptional() @IsOptional() facilityId?: string;
  @ApiPropertyOptional() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsOptional() endDate?: string;
  @ApiPropertyOptional() @IsOptional() unit?: string;
  @ApiPropertyOptional() @IsOptional() unitId?: string;
}

export class QueryStatsDto {
  @IsOptional() type?: string;
  @IsOptional() surveyKey?: string;
  @IsOptional() startDate?: string;
  @IsOptional() endDate?: string;
  @IsOptional() unit?: string;
  @IsOptional() unitId?: string;
  @IsOptional() unitIds?: string[];
  @IsOptional() reportType?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class FeedbacksService {
  constructor(private prisma: PrismaService) {}

  // ─── Submit ────────────────────────────────────────────────────────────────

  async create(dto: CreateFeedbackDto, userId?: number) {
    const facilityInfo = extractFacilityFromInfo(dto.info);
    const facilityId = facilityInfo?.unitKey ?? null;

    // Duplicate check for reflect type (O(1) using facilityId column)
    if (dto.type === 'reflect' && facilityId && dto.surveyKey) {
      const exists = await this.prisma.feedback.findFirst({
        where: { surveyKey: dto.surveyKey, facilityId, type: 'reflect' },
      });
      if (exists) {
        throw new BadRequestException('Đơn vị này đã gửi phản ánh cho khảo sát này');
      }
    }

    const status = (userId ? 'approved' : 'pending') as 'pending' | 'approved' | 'rejected';

    return this.prisma.$transaction(async (tx) => {
      const feedback = await tx.feedback.create({
        data: {
          formId: dto.formId,
          creatorName: dto.creatorName ?? 'Ẩn danh',
          status,
          type: dto.type,
          surveyKey: dto.surveyKey,
          facilityId,
          source: dto.source ?? 'web',
          ...(dto.info !== undefined ? { info: dto.info as Prisma.InputJsonValue } : {}),
          userId,
        },
      });

      if (dto.sections?.length) {
        for (const section of dto.sections) {
          const s = await tx.feedbackSection.create({
            data: {
              feedbackId: feedback.id,
              name: section.name,
            },
          });

          if (section.options?.length) {
            await tx.feedbackOption.createMany({
              data: section.options.map((opt) => ({
                feedback_section_id: s.id,
                tiendo: opt.tiendo ?? null,
                danhgia: opt.danhgia ?? null,
                ghichu: opt.ghichu ?? null,
                ...(opt.data !== undefined ? { data: opt.data as Prisma.InputJsonValue } : {}),
              })),
            });
          }
        }
      }

      return feedback;
    });
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async findAll(query: QueryFeedbackDto) {
    const { skip, take } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = {};

    if (query.type) where['type'] = query.type;
    if (query.status) where['status'] = query.status;
    if (query.surveyKey) where['surveyKey'] = query.surveyKey;
    if (query.facilityId) where['facilityId'] = query.facilityId;
    if (query.unitId) where['facilityId'] = query.unitId;
    if (query.unit) where['facilityId'] = { contains: query.unit };
    if (query.startDate || query.endDate) {
      where['createdAt'] = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where: where as Prisma.FeedbackWhereInput,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.feedback.count({ where: where as Prisma.FeedbackWhereInput }),
    ]);

    return paginatedResponse(items, total, query.page, query.limit);
  }

  // ─── Detail ────────────────────────────────────────────────────────────────

  async findOne(id: number) {
    const fb = await this.prisma.feedback.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true } },
        sections: { include: { feedback_options: true } },
      },
    });
    if (!fb) throw new NotFoundException('Phản hồi không tồn tại');
    return fb;
  }

  async updateStatus(id: number, status: string) {
    await this.findOne(id);
    return this.prisma.feedback.update({
      where: { id },
      data: { status: status as 'pending' | 'approved' | 'rejected' },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.feedback.delete({ where: { id } });
    return { message: 'Đã xóa phản hồi' };
  }

  // ─── Survey Facility Status ────────────────────────────────────────────────

  async getSurveyFacilityStatus(surveyId: number) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: { facilities: { include: { facility: true } } },
    });
    if (!survey) throw new NotFoundException('Khảo sát không tồn tại');

    const surveyKey = String(surveyId);
    const feedbacks = await this.prisma.feedback.findMany({
      where: { surveyKey },
      select: { id: true, facilityId: true, createdAt: true, status: true, creatorName: true },
    });

    const fbByFacility = new Map<string, typeof feedbacks>();
    feedbacks.forEach((fb) => {
      if (!fb.facilityId) return;
      const arr = fbByFacility.get(fb.facilityId) ?? [];
      arr.push(fb);
      fbByFacility.set(fb.facilityId, arr);
    });

    return survey.facilities.map((sf) => ({
      facilityId: sf.facilityId,
      facilityName: sf.facility.name,
      address: sf.facility.address,
      category: sf.facility.category,
      submitted: fbByFacility.has(sf.facilityId),
      feedbackCount: fbByFacility.get(sf.facilityId)?.length ?? 0,
      feedbacks: fbByFacility.get(sf.facilityId) ?? [],
    }));
  }

  async checkUnit(surveyKey: string, facilityId: string) {
    const exists = await this.prisma.feedback.findFirst({
      where: { surveyKey, facilityId },
    });
    return { submitted: !!exists };
  }

  // ─── Evaluate Dashboard ───────────────────────────────────────────────────

  async getEvaluateDashboard(surveyKey?: string) {
    const where: Record<string, unknown> = { type: 'evaluate' };
    if (surveyKey) where['surveyKey'] = surveyKey;

    const [total, statusCounts, facilityCounts] = await Promise.all([
      this.prisma.feedback.count({ where: where as Prisma.FeedbackWhereInput }),
      this.prisma.feedback.groupBy({
        by: ['status'],
        where: where as Prisma.FeedbackWhereInput,
        _count: { status: true },
      }),
      this.prisma.feedback.groupBy({
        by: ['facilityId'],
        where: where as Prisma.FeedbackWhereInput,
        _count: { _all: true },
      }),
    ]);

    const countMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.status]));

    return {
      total,
      pending: countMap['pending'] ?? 0,
      approved: countMap['approved'] ?? 0,
      rejected: countMap['rejected'] ?? 0,
      facility_count: facilityCounts.length,
      by_facility: facilityCounts.map((f) => ({
        facility_id: f.facilityId,
        count: f._count._all,
      })),
    };
  }

  // ─── Stats (ported from feedback.service.js) ──────────────────────────────

  async getStats(query: QueryStatsDto) {
    const where: Record<string, unknown> = {};
    if (query.type) where['type'] = query.type;
    if (query.surveyKey) where['surveyKey'] = query.surveyKey;
    if (query.unitId) where['facilityId'] = query.unitId;
    if (query.unitIds?.length) where['facilityId'] = { in: query.unitIds };
    if (query.startDate || query.endDate) {
      where['createdAt'] = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const STATS_MAX = 2000;
    // HIGH FIX: count real total before loading, surface truncation warning
    const [totalCount, statusCounts] = await Promise.all([
      this.prisma.feedback.count({ where: where as Prisma.FeedbackWhereInput }),
      this.prisma.feedback.groupBy({
        by: ['status'],
        where: where as Prisma.FeedbackWhereInput,
        _count: { status: true },
      }),
    ]);
    const isTruncated = totalCount > STATS_MAX;

    // PERF FIX: use select instead of include — only load fields needed for computation
    const feedbacks = await this.prisma.feedback.findMany({
      where: where as Prisma.FeedbackWhereInput,
      select: {
        createdAt: true,
        sections: {
          select: {
            name: true,
            feedback_options: {
              select: { tiendo: true, danhgia: true, data: true },
            },
          },
        },
      },
      take: STATS_MAX,
      orderBy: { createdAt: 'desc' },
    });

    // Use DB aggregation for status counts (exact, not truncated)
    const countMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.status]));
    const total = totalCount;
    const pending = countMap['pending'] ?? 0;
    const approved = countMap['approved'] ?? 0;
    const rejected = countMap['rejected'] ?? 0;

    const reflectStats = this.computeReflectStats(feedbacks);
    const evaluateStats = this.computeEvaluateStats(feedbacks);
    const trend = this.computeTrend(feedbacks);

    return {
      total, pending, approved, rejected,
      reflect: reflectStats, evaluate: evaluateStats, trend,
      // HIGH FIX: tell client if analytics data is partial
      isTruncated,
      analyzedCount: feedbacks.length,
    };
  }

  // ─── Private computations (ported 1:1) ────────────────────────────────────

  private computeReflectStats(feedbacks: Array<{
    sections: Array<{ name: string; feedback_options: Array<{ tiendo: number | null; danhgia: number | null }> }>;
  }>) {
    const sectionMap = new Map<string, {
      tiendo1: number; tiendo2: number; tiendo3: number;
      dat: number; khongDat: number; total: number;
    }>();

    feedbacks.forEach((fb) => {
      fb.sections.forEach((s) => {
        const key = s.name;
        const agg = sectionMap.get(key) ?? { tiendo1: 0, tiendo2: 0, tiendo3: 0, dat: 0, khongDat: 0, total: 0 };

        s.feedback_options.forEach((opt) => {
          agg.total++;
          if (opt.tiendo === 1) agg.tiendo1++;
          else if (opt.tiendo === 2) agg.tiendo2++;
          else if (opt.tiendo === 3) agg.tiendo3++;
          if (opt.danhgia === 1) agg.dat++;
          else if (opt.danhgia === 2) agg.khongDat++;
        });

        sectionMap.set(key, agg);
      });
    });

    return Array.from(sectionMap.entries()).map(([name, data]) => ({ name, ...data }));
  }

  private computeEvaluateStats(feedbacks: Array<{
    sections: Array<{ feedback_options: Array<{ data: unknown }> }>;
  }>) {
    const ratingDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingCount = 0;

    feedbacks.forEach((fb) => {
      fb.sections.forEach((s) => {
        s.feedback_options.forEach((opt) => {
          if (opt.data && typeof opt.data === 'object') {
            const d = opt.data as Record<string, unknown>;
            const vote = Number(d['ratingVote'] ?? d['rating'] ?? -1);
            if (vote >= 0 && vote <= 5) {
              ratingDist[vote] = (ratingDist[vote] ?? 0) + 1;
              ratingCount++;
            }
          }
        });
      });
    });

    const avg = ratingCount
      ? Object.entries(ratingDist).reduce((sum, [k, v]) => sum + Number(k) * v, 0) / ratingCount
      : 0;

    return { distribution: ratingDist, avg: Math.round(avg * 100) / 100, total: ratingCount };
  }

  private computeTrend(feedbacks: Array<{ createdAt: Date }>) {
    const byDay = new Map<string, number>();
    feedbacks.forEach((fb) => {
      const day = fb.createdAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    });
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }
}
