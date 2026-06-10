import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { USER_STATUS } from '../../../common/utils/prisma-compat.util';

export interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userPermissions: { include: { permission: true } },
      },
    });

    if (!user || user.status !== USER_STATUS.active) {
      throw new UnauthorizedException('Tài khoản không hợp lệ');
    }

    // CRITICAL FIX: Invalidate token if password was changed after token was issued
    if (user.passwordChangedAt && payload.iat) {
      const passwordChangedSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat < passwordChangedSeconds) {
        throw new UnauthorizedException('Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.');
      }
    }

    return user;
  }
}
