import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';

export class CreatePostDto {
  @IsString() title!: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() categoryId?: number;
  @IsOptional() @IsEnum(['draft', 'published']) status?: string;
  @IsOptional() isFeatured?: boolean;
  @IsOptional() expiresAt?: Date;
}

export class QueryPostDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(['draft', 'published']) status?: string;
  @ApiPropertyOptional() @IsOptional() categoryId?: number;
}

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryPostDto, userId?: number, isAdmin = false) {
    const { skip, take } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = {};

    if (query.search) {
      where['OR'] = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { summary: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where['status'] = query.status;
    if (query.categoryId) where['categoryId'] = query.categoryId;
    if (!isAdmin) where['status'] = 'published'; // Public only sees published

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: where as Prisma.PostWhereInput,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.post.count({ where: where as Prisma.PostWhereInput }),
    ]);

    return paginatedResponse(posts, total, query.page, query.limit);
  }

  async findOne(id: number) {
    // MEDIUM FIX: atomic update+return eliminates view-count race condition
    const post = await this.prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: { author: { select: { id: true, fullName: true } } },
    }).catch(() => null);

    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    return post;
  }

  async create(dto: CreatePostDto, authorId: number) {
    return this.prisma.post.create({
      data: { ...dto, authorId },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  async update(id: number, dto: Partial<CreatePostDto>) {
    await this.findOne(id);
    return this.prisma.post.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.post.delete({ where: { id } });
    return { message: 'Đã xóa bài viết' };
  }

  async setImage(id: number, imageUrl: string) {
    return this.prisma.post.update({ where: { id }, data: { imageUrl } });
  }
}
