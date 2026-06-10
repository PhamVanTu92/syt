import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IsString, IsOptional, IsEnum, IsArray, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';
import {
  toSurveyStatus, fromSurveyStatus,
  toSurveyFormIds, fromSurveyFormIds,
} from '../../common/utils/prisma-compat.util';

export class CreateSurveyDto {
  @IsString() name!: string;
  @IsOptional() @IsEnum(['reflect', 'evaluate']) type?: string;
  @IsOptional() @Type(() => Date) dateFrom?: Date;
  @IsOptional() @Type(() => Date) dateTo?: Date;
  @IsOptional() @IsArray() @IsInt({ each: true }) formIds?: number[];
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) facilityIds?: string[];
}

export class QuerySurveyDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() type?: string;
  @ApiPropertyOptional() @IsOptional() status?: string;
}

@Injectable()
export class SurveysService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QuerySurveyDto) {
    const { skip, take } = paginate(query.page, query.limit);
    await this.autoExpireSurveys();

    const where: Record<string, unknown> = {};
    if (query.type) where['type'] = query.type;
    // Survey.status is Boolean? — map string filter value
    if (query.status !== undefined) where['status'] = toSurveyStatus(query.status);
    if (query.search) where['name'] = { contains: query.search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.survey.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          facilities: { include: { facility: { select: { id: true, name: true, category: true } } } },
        },
      }),
      this.prisma.survey.count({ where }),
    ]);

    return paginatedResponse(items.map(this.formatSurvey), total, query.page, query.limit);
  }

  async findOne(id: number) {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
      include: {
        facilities: { include: { facility: true } },
      },
    });
    if (!survey) throw new NotFoundException('Khảo sát không tồn tại');
    return this.formatSurvey(survey);
  }

  async create(dto: CreateSurveyDto) {
    const { facilityIds, formIds, status, ...data } = dto;
    const boolStatus = toSurveyStatus(status ?? 'active') ?? true;

    if (boolStatus && dto.type) {
      // Deactivate other active surveys of same type
      await this.prisma.survey.updateMany({
        where: { type: dto.type, status: true },
        data: { status: false },
      });
    }

    const survey = await this.prisma.survey.create({
      data: {
        ...data,
        status: boolStatus,
        formIds: toSurveyFormIds(formIds),
        facilities: facilityIds?.length
          ? { create: facilityIds.map((facilityId) => ({ facilityId })) }
          : undefined,
      },
      include: {
        facilities: { include: { facility: { select: { id: true, name: true } } } },
      },
    });
    return this.formatSurvey(survey);
  }

  async update(id: number, dto: Partial<CreateSurveyDto>) {
    await this.findOne(id);
    const { facilityIds, formIds, status, ...data } = dto;
    const boolStatus = toSurveyStatus(status);

    if (boolStatus === true && dto.type) {
      await this.prisma.survey.updateMany({
        where: { type: dto.type, status: true, id: { not: id } },
        data: { status: false },
      });
    }

    const survey = await this.prisma.survey.update({
      where: { id },
      data: {
        ...data,
        ...(status !== undefined ? { status: boolStatus } : {}),
        ...(formIds !== undefined ? { formIds: toSurveyFormIds(formIds) } : {}),
        ...(facilityIds !== undefined
          ? {
              facilities: {
                deleteMany: {},
                create: facilityIds.map((facilityId) => ({ facilityId })),
              },
            }
          : {}),
      },
      include: { facilities: { include: { facility: true } } },
    });
    return this.formatSurvey(survey);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.survey.delete({ where: { id } });
    return { message: 'Đã xóa khảo sát' };
  }

  // ─── Facilities Sub-routes ──────────────────────────────────────────────────

  async getFacilities(surveyId: number) {
    await this.findOne(surveyId);
    const facs = await this.prisma.surveyFacility.findMany({
      where: { surveyId },
      include: { facility: true },
    });
    return facs.map((f) => f.facility);
  }

  async setFacilities(surveyId: number, facilityIds: string[]) {
    await this.findOne(surveyId);
    await this.prisma.surveyFacility.deleteMany({ where: { surveyId } });
    if (facilityIds.length) {
      await this.prisma.surveyFacility.createMany({
        data: facilityIds.map((facilityId) => ({ surveyId, facilityId })),
      });
    }
    return { message: 'Đã cập nhật danh sách cơ sở' };
  }

  async addFacility(surveyId: number, facilityId: string) {
    await this.findOne(surveyId);
    await this.prisma.surveyFacility.upsert({
      where: { surveyId_facilityId: { surveyId, facilityId } },
      update: {},
      create: { surveyId, facilityId },
    });
    return { message: 'Đã thêm cơ sở' };
  }

  async removeFacility(surveyId: number, facilityId: string) {
    await this.prisma.surveyFacility.deleteMany({ where: { surveyId, facilityId } });
    return { message: 'Đã xóa cơ sở khỏi khảo sát' };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async autoExpireSurveys() {
    const now = new Date();
    await this.prisma.survey.updateMany({
      where: { status: true, dateTo: { lt: now } },
      data: { status: false },
    });
  }

  private formatSurvey(survey: Record<string, unknown>) {
    return {
      ...survey,
      // Map Boolean? back to 'active'/'inactive' for API consumers
      status: fromSurveyStatus(survey['status'] as boolean | null | undefined),
      // Map JSON string back to number[] for API consumers
      formIds: fromSurveyFormIds(survey['formIds'] as string | null | undefined),
    };
  }
}
