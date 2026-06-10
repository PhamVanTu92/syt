import { Global, Module } from '@nestjs/common';
import { PermissionCacheService } from './permission-cache.service';
import { TokenHmacService } from './token-hmac.service';

@Global()
@Module({
  providers: [PermissionCacheService, TokenHmacService],
  exports: [PermissionCacheService, TokenHmacService],
})
export class CommonServicesModule {}
