import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsInt, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';

export class CreateScheduleDto {
  @IsString() title!: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() startTime?: Date;
  @IsOptional() endTime?: Date;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() coordinatingUnit?: string;
  @IsOptional() @IsEnum(['NORMAL', 'IMPORTANT', 'URGENT']) priority?: string;
  @IsOptional() @IsString() licensePlate?: string;
  @IsOptional() presiderId?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) attendeeIds?: number[];
}

export class QueryScheduleDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(['DRAFT', 'APPROVED', 'CANCELLED']) status?: string;
  @ApiPropertyOptional() @IsOptional() unit?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) startDate?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) endDate?: Date;
}

export class ApproveScheduleDto {
  @IsEnum(['APPROVED', 'CANCELLED']) action!: string;
}

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryScheduleDto) {
    const { skip, take } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = {};
    if (query.status) where['status'] = query.status;
    if (query.unit) where['coordinatingUnit'] = { contains: query.unit, mode: 'insensitive' };
    if (query.startDate || query.endDate) {
      where['startTime'] = {
        ...(query.startDate ? { gte: query.startDate } : {}),
        ...(query.endDate ? { lte: query.endDate } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.workSchedule.findMany({
        where: where as Prisma.WorkScheduleWhereInput,
        skip,
        take,
        orderBy: { startTime: 'asc' },
        include: {
          // PERF FIX: return count only in list — full attendees only in detail
          _count: { select: { attendees: true } },
          attachments: { select: { id: true, file_path: true, file_name: true } },
        },
      }),
      this.prisma.workSchedule.count({ where: where as Prisma.WorkScheduleWhereInput }),
    ]);

    return paginatedResponse(items, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const s = await this.prisma.workSchedule.findUnique({
      where: { id },
      include: {
        attendees: { include: { user: { select: { id: true, fullName: true } } } },
        attachments: true,
      },
    });
    if (!s) throw new NotFoundException('Lịch công tác không tồn tại');
    return s;
  }

  async create(dto: CreateScheduleDto, createdBy: number) {
    const { attendeeIds, ...data } = dto;
    type WsStatus   = 'DRAFT' | 'APPROVED' | 'CANCELLED';
    type WsPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
    return this.prisma.workSchedule.create({
      data: {
        ...data,
        startTime: data.startTime ?? new Date(),
        endTime: data.endTime ?? new Date(),
        priority: (data.priority ?? 'NORMAL') as WsPriority,
        createdBy,
        status: 'DRAFT' as WsStatus,
        attendees: attendeeIds?.length
          ? { create: attendeeIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: { attendees: { include: { user: { select: { id: true, fullName: true } } } } },
    });
  }

  async update(id: number, dto: Partial<CreateScheduleDto>, userId: number) {
    const schedule = await this.findOne(id);
    if (schedule.createdBy !== userId && (schedule.status as string) === 'APPROVED') {
      throw new ForbiddenException('Không thể sửa lịch đã duyệt');
    }
    type WsPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
    const { attendeeIds, priority, ...data } = dto;

    await this.prisma.workSchedule.update({
      where: { id },
      data: {
        ...data,
        ...(priority !== undefined ? { priority: priority as WsPriority } : {}),
        ...(attendeeIds !== undefined
          ? {
              attendees: {
                deleteMany: {},
                create: attendeeIds.map((userId) => ({ userId })),
              },
            }
          : {}),
      },
    });
    return this.findOne(id);
  }

  async remove(id: number, userId: number) {
    const schedule = await this.findOne(id);
    if (schedule.createdBy !== userId) throw new ForbiddenException();
    await this.prisma.workSchedule.delete({ where: { id } });
    return { message: 'Đã xóa lịch công tác' };
  }

  async approve(id: number, dto: ApproveScheduleDto, approvedBy: number) {
    await this.findOne(id);
    return this.prisma.workSchedule.update({
      where: { id },
      data: { status: dto.action as 'DRAFT' | 'APPROVED' | 'CANCELLED', approvedBy },
    });
  }
}
