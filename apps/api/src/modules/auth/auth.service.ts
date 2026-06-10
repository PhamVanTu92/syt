import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenHmacService } from '../../common/services/token-hmac.service';
import { EmailService } from '../email/email.service';
import { USER_STATUS, fromUserStatus } from '../../common/utils/prisma-compat.util';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
    private tokenHmac: TokenHmacService,
  ) {}

  async login(dto: LoginDto, res: Response) {
    // PERF FIX: minimal select — only fields needed for auth check & response
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true, email: true, fullName: true, role: true,
        status: true, unit: true, isVerified: true, password: true,
        userRoles: { select: { roleId: true, role: { select: { id: true, name: true, description: true } } } },
      },
    });

    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (user.status !== USER_STATUS.active) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email);

    // PERF FIX: parallel — store token + load permissions simultaneously
    const [permissions] = await Promise.all([
      this.loadPermissions(user.id, user.userRoles.map((ur) => ur.roleId)),
      this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: this.tokenHmac.sign(refreshToken) },
      }),
    ]);

    this.setRefreshCookie(res, refreshToken);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: fromUserStatus(user.status),
        unit: user.unit,
        isVerified: user.isVerified,
        permissions,
        roles: user.userRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
        })),
      },
    };
  }

  /** Load effective permissions with 2 parallel queries — replaces deep nested includes */
  private async loadPermissions(userId: number, roleIds: number[]): Promise<string[]> {
    const [userPerms, rolePerms] = await Promise.all([
      this.prisma.userPermission.findMany({
        where: { userId },
        select: { permission: { select: { name: true } } },
      }),
      roleIds.length
        ? this.prisma.rolePermission.findMany({
            where: { roleId: { in: roleIds } },
            select: { permission: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);

    const perms = new Set<string>();
    userPerms.forEach((up) => perms.add(up.permission.name));
    rolePerms.forEach((rp) => perms.add(rp.permission.name));
    return Array.from(perms);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hash,
        fullName: dto.fullName,
        unit: dto.unit,
        role: 'user' as const,
        status: USER_STATUS.pending,
        isVerified: false,
      },
    });

    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  async refresh(userId: number, email: string, storedHash: string | null, token: string, res: Response) {
    if (!storedHash) throw new UnauthorizedException();
    // PERF FIX: HMAC verify instead of bcrypt.compare
    const valid = this.tokenHmac.verify(token, storedHash);
    if (!valid) throw new UnauthorizedException('Refresh token không hợp lệ');

    const { accessToken, refreshToken } = await this.generateTokens(userId, email);

    // Rotate refresh token
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: this.tokenHmac.sign(refreshToken) },
    });

    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  async logout(userId: number, res: Response) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    res.clearCookie('refresh_token');
    return { message: 'Đăng xuất thành công' };
  }

  async me(userId: number) {
    // PERF FIX: minimal select + parallel permission load
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, fullName: true, role: true,
        status: true, unit: true, isVerified: true,
        userRoles: { select: { roleId: true, role: { select: { id: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException();

    const permissions = await this.loadPermissions(userId, user.userRoles.map((ur) => ur.roleId));

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      unit: user.unit,
      isVerified: user.isVerified,
      permissions,
      roles: user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hash,
        passwordChangedAt: new Date(),
        refreshToken: null,
      },
    });
    return { message: 'Đổi mật khẩu thành công' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // HIGH FIX: implemented — generate reset token and send email
    // Always return same message to prevent user enumeration
    const GENERIC_MSG = 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.';

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) return { message: GENERIC_MSG };

    // Generate a secure random token, store hashed version with 1hr TTL
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in refreshToken field temporarily (reuse existing column)
    // In production, create a separate password_reset_tokens table
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // Encode: hash|expiry to distinguish from refresh token
        refreshToken: `reset:${tokenHash}:${expiresAt.getTime()}`,
      },
    });

    try {
      await this.email.sendPasswordReset(user.email, rawToken);
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${user.email}`, err);
      // Don't leak error — still return generic message
    }

    return { message: GENERIC_MSG };
  }

  async confirmPasswordReset(email: string, token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user?.refreshToken?.startsWith('reset:')) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    const [, tokenHash, expiryStr] = user.refreshToken.split(':');
    const expiry = Number(expiryStr);

    if (Date.now() > expiry) {
      throw new BadRequestException('Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.');
    }

    const isValid = await bcrypt.compare(token, tokenHash);
    if (!isValid) throw new BadRequestException('Token không hợp lệ');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hash, passwordChangedAt: new Date(), refreshToken: null },
    });

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async generateTokens(userId: number, email: string) {
    const payload = { sub: userId, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/', // MEDIUM FIX: was '/api/v2/auth/refresh' — too restrictive, cookie not sent to other endpoints
    });
  }

  private flattenPermissions(user: {
    role: string;
    userPermissions: { permission: { name: string } }[];
    userRoles: { role: { rolePermissions: { permission: { name: string } }[] } }[];
  }): string[] {
    const perms = new Set<string>();
    user.userPermissions?.forEach((up) => perms.add(up.permission.name));
    user.userRoles?.forEach((ur) => {
      ur.role?.rolePermissions?.forEach((rp) => perms.add(rp.permission.name));
    });
    return Array.from(perms);
  }
}
