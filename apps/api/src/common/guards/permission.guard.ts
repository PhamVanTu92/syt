import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User, UserPermission, UserRole, RolePermission, Role, Permission } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionCacheService } from '../services/permission-cache.service';

type UserWithRelations = User & {
  userRoles: (UserRole & { role: Role & { rolePermissions: (RolePermission & { permission: Permission })[] } })[];
  userPermissions: (UserPermission & { permission: Permission })[];
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permCache: PermissionCacheService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<{ user: UserWithRelations }>();
    const user = req.user;
    if (!user) return false;

    const effectivePerms = this.getEffectivePerms(user);

    // Super admin: role=admin, no individual perms, no assigned roles
    if (user.role === 'admin' && effectivePerms.length === 0) return true;

    return required.some((perm) => this.hasPermission(effectivePerms, perm));
  }

  private getEffectivePerms(user: UserWithRelations): string[] {
    // HIGH FIX: use shared PermissionCacheService so UsersService can invalidate it
    const cached = this.permCache.get(user.id);
    if (cached) return cached;

    const perms = new Set<string>();
    user.userPermissions?.forEach((up) => perms.add(up.permission.name));
    user.userRoles?.forEach((ur) => {
      ur.role?.rolePermissions?.forEach((rp) => perms.add(rp.permission.name));
    });

    const arr = Array.from(perms);
    this.permCache.set(user.id, arr);
    return arr;
  }

  private hasPermission(userPerms: string[], required: string): boolean {
    if (userPerms.includes(required)) return true;
    const parts = required.split('.');
    for (let i = 1; i < parts.length; i++) {
      if (userPerms.includes(parts.slice(0, i).join('.'))) return true;
    }
    return false;
  }
}
