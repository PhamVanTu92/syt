import { Injectable, NotFoundException } from '@nestjs/common';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateBannerDto {
  @IsEnum(['top', 'left', 'right', 'footer']) position!: string;
  @IsString() imageUrl!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() linkUrl?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  findAll(position?: string) {
    return this.prisma.banner.findMany({
      where: { ...(position ? { position } : {}), isActive: true },
      orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  findAllAdmin() {
    return this.prisma.banner.findMany({ orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }] });
  }

  async create(dto: CreateBannerDto) {
    const { position, imageUrl, title, linkUrl, sortOrder, isActive } = dto;
    return this.prisma.banner.create({
      data: {
        position,
        imageUrl,
        ...(title !== undefined ? { title } : {}),
        ...(linkUrl !== undefined ? { linkUrl } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
  }

  async update(id: number, dto: Partial<CreateBannerDto>) {
    const b = await this.prisma.banner.findUnique({ where: { id } });
    if (!b) throw new NotFoundException();
    return this.prisma.banner.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.prisma.banner.delete({ where: { id } });
    return { message: 'Đã xóa banner' };
  }

  async reorder(ids: number[]) {
    await Promise.all(
      ids.map((id, idx) =>
        this.prisma.banner.update({ where: { id }, data: { sortOrder: idx } }),
      ),
    );
    return { message: 'Đã cập nhật thứ tự' };
  }
}
