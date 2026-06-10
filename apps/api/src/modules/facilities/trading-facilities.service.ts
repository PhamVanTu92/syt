import { Injectable, NotFoundException } from '@nestjs/common';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';

export class CreateTradingFacilityDto {
  @IsString() name!: string;
  @IsOptional() @IsString() certificateNumber?: string;
  @IsOptional() @IsString() personInCharge?: string;
  @IsOptional() @IsString() facilityType?: string;
  @IsOptional() @IsEnum(['wholesale', 'retail']) tradingType?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class QueryTradingDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() tradingType?: string;
  @ApiPropertyOptional() @IsOptional() facilityType?: string;
  @ApiPropertyOptional() @IsOptional() isActive?: boolean;
}

@Injectable()
export class TradingFacilitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryTradingDto) {
    const { skip, take } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = {};
    if (query.search) where['name'] = { contains: query.search, mode: 'insensitive' };
    if (query.tradingType) where['tradingType'] = query.tradingType;
    if (query.facilityType) where['facilityType'] = query.facilityType;
    if (query.isActive !== undefined) where['isActive'] = query.isActive;

    const [items, total] = await Promise.all([
      this.prisma.tradingFacility.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      this.prisma.tradingFacility.count({ where }),
    ]);
    return paginatedResponse(items, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const f = await this.prisma.tradingFacility.findUnique({ where: { id } });
    if (!f) throw new NotFoundException();
    return f;
  }

  create(dto: CreateTradingFacilityDto) { return this.prisma.tradingFacility.create({ data: dto }); }

  async update(id: number, dto: Partial<CreateTradingFacilityDto>) {
    await this.findOne(id);
    return this.prisma.tradingFacility.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.tradingFacility.delete({ where: { id } });
    return { message: 'Đã xóa' };
  }
}
