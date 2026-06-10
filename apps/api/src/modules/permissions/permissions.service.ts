import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export class CreatePermissionDto {
  name!: string;
  description?: string;
  parentId?: number;
}

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
      include: { children: true },
    });
  }

  async create(dto: CreatePermissionDto) {
    return this.prisma.permission.create({ data: dto });
  }

  async update(id: number, dto: Partial<CreatePermissionDto>) {
    const perm = await this.prisma.permission.findUnique({ where: { id } });
    if (!perm) throw new NotFoundException();
    return this.prisma.permission.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.prisma.permission.delete({ where: { id } });
    return { message: 'Đã xóa quyền' };
  }
}
