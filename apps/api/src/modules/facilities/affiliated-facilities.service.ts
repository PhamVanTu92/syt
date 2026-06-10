import { Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateAffiliatedFacilityDto {
  @IsString() name!: string;
  @IsOptional() @IsString() logo?: string;
}

@Injectable()
export class AffiliatedFacilitiesService {
  constructor(private prisma: PrismaService) {}

  findAll() { return this.prisma.affiliatedFacility.findMany({ orderBy: { name: 'asc' } }); }

  async findOne(id: number) {
    const f = await this.prisma.affiliatedFacility.findUnique({ where: { id } });
    if (!f) throw new NotFoundException();
    return f;
  }

  create(dto: CreateAffiliatedFacilityDto) { return this.prisma.affiliatedFacility.create({ data: dto }); }

  async update(id: number, dto: Partial<CreateAffiliatedFacilityDto>) {
    await this.findOne(id);
    return this.prisma.affiliatedFacility.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.affiliatedFacility.delete({ where: { id } });
    return { message: 'Đã xóa' };
  }
}
