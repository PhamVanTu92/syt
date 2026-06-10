import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokenHmacService } from '../../../common/services/token-hmac.service';
import type { JwtPayload } from './jwt.strategy';
import { USER_STATUS } from '../../../common/utils/prisma-compat.util';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private tokenHmac: TokenHmacService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req?.cookies as Record<string, string>)?.['refresh_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const rawToken = (req.cookies as Record<string, string>)?.['refresh_token'];
    if (!rawToken) throw new UnauthorizedException('Refresh token không tồn tại');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    if (user.status !== USER_STATUS.active) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');

    if (!user.refreshToken) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    // PERF FIX: HMAC verify (<1ms vs bcrypt ~300ms) — safe because tokens are 32-byte random
    const isValid = this.tokenHmac.verify(rawToken, user.refreshToken);
    if (!isValid) throw new UnauthorizedException('Refresh token không hợp lệ');

    return user;
  }
}
