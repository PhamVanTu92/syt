import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * HMAC-SHA256 token service — replaces bcrypt for refresh tokens.
 *
 * Why: bcrypt costs 200-500ms per hash (by design for passwords).
 * For refresh tokens this is unnecessary — they're already random 32-byte values.
 * HMAC-SHA256 is <1ms and still secure (no brute-force risk because tokens are random).
 */
@Injectable()
export class TokenHmacService {
  private readonly secret: string;

  constructor(private config: ConfigService) {
    this.secret = config.get<string>('JWT_REFRESH_SECRET', 'refresh-secret');
  }

  /** Create deterministic HMAC signature for a token */
  sign(token: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(token)
      .digest('hex');
  }

  /** Verify token matches its stored HMAC signature (constant-time) */
  verify(rawToken: string, storedHmac: string): boolean {
    const expected = this.sign(rawToken);
    // timingSafeEqual prevents timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(storedHmac, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
