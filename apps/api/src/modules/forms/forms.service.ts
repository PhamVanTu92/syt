import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';
import type { CreateFormDto } from './dto/form.dto';

@Injectable()
export class FormsService {
  constructor(private prisma: PrismaService) {}

  // ─── List ───────────────────────────────────────────────────────────────────

  async findAll(query: PaginationDto & { status?: string; type?: string }) {
    const { skip, take } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) where['name'] = { contains: query.search, mode: 'insensitive' };
    if (query.status) where['status'] = query.status;
    if (query.type) where['type'] = query.type;

    const [items, total, statusGroups] = await Promise.all([
      this.prisma.form.findMany({
        where: where as Prisma.FormWhereInput,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, type: true, status: true,
          description: true, createdAt: true, updatedAt: true,
        },
      }),
      this.prisma.form.count({ where: where as Prisma.FormWhereInput }),
      this.prisma.form.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),
    ]);

    // Batch-count feedbacks per form (1 query, not N)
    const formIds = items.map((f) => f.id);
    const feedbackCounts = await this.prisma.feedback.groupBy({
      by: ['formId'],
      where: { formId: { in: formIds } },
      _count: { formId: true },
    });
    const fbCountMap = new Map(feedbackCounts.map((fc) => [fc.formId, fc._count.formId]));

    const statusMap = Object.fromEntries(statusGroups.map((g) => [g.status, g._count.status]));
    const enriched = items.map((f) => ({
      ...f,
      feedbackCount: fbCountMap.get(f.id) ?? 0,
    }));

    return {
      ...paginatedResponse(enriched, total, query.page, query.limit),
      activeCount: statusMap['active'] ?? 0,
      inactiveCount: statusMap['inactive'] ?? 0,
    };
  }

  // ─── Detail ─────────────────────────────────────────────────────────────────

  async findOne(id: number) {
    const form = await this.prisma.form.findFirst({
      where: { id, deletedAt: null },
    });
    if (!form) throw new NotFoundException('Biểu mẫu không tồn tại');
    return form;
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateFormDto) {
    const { sections, info, status, name, description, type } = dto;

    return this.prisma.form.create({
      data: {
        name,
        ...(description !== undefined ? { description } : {}),
        ...(type !== undefined ? { type } : {}),
        status: (status ?? 'active') as 'active' | 'inactive',
        data: sections ? JSON.stringify(sections) : '[]',
        ...(info !== undefined ? { info: JSON.stringify(info) } : {}),
      },
    });
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(id: number, dto: Partial<CreateFormDto>) {
    await this.findOne(id);
    const { sections, info, status, name, description, type } = dto;

    return this.prisma.form.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(status !== undefined ? { status: status as 'active' | 'inactive' } : {}),
        ...(sections !== undefined ? { data: JSON.stringify(sections) } : {}),
        ...(info !== undefined ? { info: JSON.stringify(info) } : {}),
      },
    });
  }

  // ─── Soft Delete ────────────────────────────────────────────────────────────

  async remove(id: number) {
    await this.findOne(id);

    const surveysUsing = await this.prisma.survey.findFirst({
      where: {
        status: true, // Survey.status is Boolean? (true=active)
        formIds: { path: [], array_contains: id },
      },
    });
    if (surveysUsing) {
      throw new BadRequestException('Biểu mẫu đang được sử dụng trong khảo sát đang hoạt động');
    }

    await this.prisma.form.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Đã xóa biểu mẫu' };
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats(id: number, from?: Date, to?: Date) {
    const form = await this.findOne(id);
    const dateFilter = from || to ? { gte: from, lte: to } : undefined;

    const feedbacks = await this.prisma.feedback.findMany({
      where: {
        formId: id,
        status: 'approved',
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: {
        sections: {
          include: { feedback_options: true },
        },
      },
    });

    return this.computeStats(form, feedbacks);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private computeStats(
    form: { id: number; name: string; data: string },
    feedbacks: Array<{
      sections: Array<{
        name: string;
        feedback_options: Array<{ tiendo: number | null; danhgia: number | null; data: unknown }>;
      }>;
    }>,
  ) {
    const total = feedbacks.length;

    // Parse sections from JSON data field
    let parsedSections: Array<{ title?: string; questions?: Array<{ questionKey: string; label: string; type: string }> }> = [];
    try { parsedSections = JSON.parse(form.data) as typeof parsedSections; } catch { parsedSections = []; }

    const sectionStats = parsedSections.map((section) => {
      const questionStats = (section.questions ?? []).map((question) => {
        const answers: number[] = [];
        const distribution: Record<string, number> = {};

        feedbacks.forEach((fb) => {
          fb.sections.forEach((fs) => {
            fs.feedback_options.forEach((fo) => {
              if (question.type === 'likert' && fo.danhgia != null) {
                answers.push(fo.danhgia);
                distribution[fo.danhgia] = (distribution[fo.danhgia] ?? 0) + 1;
              }
            });
          });
        });

        const avg = answers.length
          ? answers.reduce((a, b) => a + b, 0) / answers.length
          : 0;
        const satisfactionRate = answers.length
          ? ((distribution['4'] ?? 0) + (distribution['5'] ?? 0)) / answers.length
          : 0;

        return {
          questionKey: question.questionKey,
          label: question.label,
          type: question.type,
          totalAnswers: answers.length,
          avg: Math.round(avg * 100) / 100,
          distribution,
          satisfactionRate: Math.round(satisfactionRate * 100),
        };
      });

      return { title: section.title, questions: questionStats };
    });

    return { formId: form.id, formName: form.name, total, sections: sectionStats };
  }
}
