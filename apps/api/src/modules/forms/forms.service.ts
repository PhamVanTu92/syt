import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';
import type { CreateFormDto, CreateFormSectionDto } from './dto/form.dto';

type PrismaTx = Prisma.TransactionClient;

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

    // PERF FIX: fetch forms + total in parallel; counts via groupBy (2 queries total, not N+2)
    const [items, total, statusGroups] = await Promise.all([
      this.prisma.form.findMany({
        where: where as Prisma.FormWhereInput,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, type: true, status: true,
          description: true, createdAt: true, updatedAt: true,
          _count: { select: { sections: true } }, // sections count is cheap (form-scoped)
        },
      }),
      this.prisma.form.count({ where: where as Prisma.FormWhereInput }),
      // Single groupBy replaces 2 count queries
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
      _count: { sections: f._count.sections, feedbacks: fbCountMap.get(f.id) ?? 0 },
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
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: { options: { orderBy: { orderIndex: 'asc' } } },
            },
          },
        },
      },
    });
    if (!form) throw new NotFoundException('Biểu mẫu không tồn tại');
    return form;
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateFormDto) {
    const { sections, info, ...formData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const form = await tx.form.create({
        data: {
          ...formData,
          status: formData.status ?? 'active',
          ...(info !== undefined ? { info: info as Prisma.InputJsonValue } : {}),
        },
      });

      if (sections?.length) {
        await this.createSections(tx, form.id, sections);
      }

      return this.findOneInTx(tx, form.id);
    });
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(id: number, dto: Partial<CreateFormDto>) {
    await this.findOne(id);
    const { sections, info, ...formData } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.form.update({
        where: { id },
        data: { ...formData, ...(info !== undefined ? { info: info as Prisma.InputJsonValue } : {}) },
      });

      if (sections !== undefined) {
        // Replace all sections
        await tx.formSection.deleteMany({ where: { formId: id } });
        if (sections.length) await this.createSections(tx, id, sections);
      }

      return this.findOneInTx(tx, id);
    });
  }

  // ─── Soft Delete ────────────────────────────────────────────────────────────

  async remove(id: number) {
    await this.findOne(id);

    // Check if form is used in active surveys
    const surveysUsing = await this.prisma.survey.findFirst({
      where: {
        status: 'active',
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
    const dateFilter = from || to
      ? { gte: from, lte: to }
      : undefined;

    const feedbacks = await this.prisma.feedback.findMany({
      where: {
        formId: id,
        status: 'approved',
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: {
        sections: {
          include: { options: true },
        },
      },
    });

    return this.computeStats(form, feedbacks);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async createSections(tx: PrismaTx, formId: number, sections: CreateFormSectionDto[]) {
    for (const [sIdx, section] of sections.entries()) {
      const s = await tx.formSection.create({
        data: { formId, title: section.title, orderIndex: section.orderIndex ?? sIdx },
      });

      if (section.questions?.length) {
        for (const [qIdx, q] of section.questions.entries()) {
          const question = await tx.formQuestion.create({
            data: {
              sectionId: s.id,
              questionKey: q.questionKey,
              label: q.label,
              type: q.type,
              required: q.required ?? false,
              scoreWeight: q.scoreWeight ?? 1,
              orderIndex: q.orderIndex ?? qIdx,
            },
          });

          if (q.options?.length) {
            await tx.formOption.createMany({
              data: q.options.map((opt, oIdx) => ({
                questionId: question.id,
                optionKey: opt.optionKey,
                label: opt.label,
                orderIndex: opt.orderIndex ?? oIdx,
              })),
            });
          }
        }
      }
    }
  }

  private async findOneInTx(tx: PrismaTx, id: number) {
    return tx.form.findFirst({
      where: { id },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: { options: { orderBy: { orderIndex: 'asc' } } },
            },
          },
        },
      },
    });
  }

  private computeStats(
    form: Awaited<ReturnType<FormsService['findOne']>>,
    feedbacks: Array<{
      sections: Array<{
        options: Array<{ tiendo: number | null; danhgia: number | null; data: unknown }>;
      }>;
    }>,
  ) {
    const total = feedbacks.length;
    const sectionStats = form.sections.map((section) => {
      const questionStats = section.questions.map((question) => {
        const answers: number[] = [];
        const distribution: Record<string, number> = {};

        feedbacks.forEach((fb) => {
          fb.sections.forEach((fs) => {
            fs.options.forEach((fo) => {
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
        const satisfactionRate =
          answers.length
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

      return { sectionId: section.id, title: section.title, questions: questionStats };
    });

    return { formId: form.id, formName: form.name, total, sections: sectionStats };
  }
}
