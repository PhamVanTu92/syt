import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionCacheService } from '../../common/services/permission-cache.service';
import { PaginationDto, paginate, paginatedResponse } from '../../common/dto/pagination.dto';
import type { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import {
  USER_STATUS, toUserStatus, toUserRole, fromUserStatus,
} from '../../common/utils/prisma-compat.util';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private permCache: PermissionCacheService,
  ) {}

  async findAll(query: PaginationDto) {
    const { skip, take } = paginate(query.page, query.limit);
    const where = query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          userRoles: { include: { role: true } },
          userPermissions: { include: { permission: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginatedResponse(users.map(this.formatUser), total, query.page, query.limit);
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userPermissions: { include: { permission: true } },
      },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return this.formatUser(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hash,
        fullName: dto.fullName,
        role: toUserRole(dto.role) ?? 'user',
        unit: dto.unit,
        status: toUserStatus(dto.status ?? 'active') ?? USER_STATUS.active,
        isVerified: true,
      },
    });
    return this.formatUser(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.status !== undefined ? { status: toUserStatus(dto.status) } : {}),
        ...(dto.role !== undefined ? { role: toUserRole(dto.role) } : {}),
      },
    });
    return this.formatUser(user);
  }

  async remove(id: number, requesterId: number) {
    if (id === requesterId) throw new ForbiddenException('Không thể xóa tài khoản của chính mình');
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Đã xóa người dùng' };
  }

  async assignRole(userId: number, roleId: number) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    if (!role) throw new NotFoundException('Vai trò không tồn tại');

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
    // HIGH FIX: invalidate cache so permission change takes effect immediately
    this.permCache.invalidate(userId);
    return { message: 'Đã gán vai trò' };
  }

  async removeRole(userId: number, roleId: number) {
    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });
    this.permCache.invalidate(userId); // HIGH FIX: immediate cache invalidation
    return { message: 'Đã gỡ vai trò' };
  }

  async assignPermissions(userId: number, permissionNames: string[]) {
    await this.findOne(userId);
    const permissions = await this.prisma.permission.findMany({
      where: { name: { in: permissionNames } },
    });

    // Remove existing, then re-assign
    await this.prisma.userPermission.deleteMany({ where: { userId } });
    if (permissions.length) {
      await this.prisma.userPermission.createMany({
        data: permissions.map((p) => ({ userId, permissionId: p.id })),
      });
    }
    this.permCache.invalidate(userId); // HIGH FIX: immediate cache invalidation
    return { message: 'Đã cập nhật quyền' };
  }

  async getLeaders() {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['leader', 'admin'] as ('admin' | 'user' | 'office' | 'leader')[] },
        status: USER_STATUS.active,
      },
      orderBy: { fullName: 'asc' },
    });
    return users.map(this.formatUser);
  }

  private formatUser(user: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...safe } = user as {
      password: string;
      refreshToken: string | null;
      status: number;
      [key: string]: unknown;
    };
    void password; void refreshToken;
    return {
      ...safe,
      // Map Int status back to string for API consumers
      status: fromUserStatus(safe['status'] as number),
    };
  }
}
