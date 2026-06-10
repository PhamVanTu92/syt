import { Injectable } from '@nestjs/common';

interface CacheEntry {
  perms: string[];
  exp: number;
}

/**
 * Shared in-memory permission cache.
 * Registered as a global service so both PermissionGuard and UsersService
 * can inject it — guard reads it, user mutations invalidate it.
 *
 * Uses LRU-like eviction: when cache exceeds MAX_ENTRIES, oldest entries removed.
 */
@Injectable()
export class PermissionCacheService {
  private readonly cache = new Map<number, CacheEntry>();
  private readonly TTL_MS = 5 * 60 * 1_000;     // 5 minutes
  private readonly MAX_ENTRIES = 10_000;          // ~10MB at ~1KB/entry

  get(userId: number): string[] | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;
    if (entry.exp <= Date.now()) {
      this.cache.delete(userId);
      return null;
    }
    // Move to end (LRU: most recently used = last)
    this.cache.delete(userId);
    this.cache.set(userId, entry);
    return entry.perms;
  }

  set(userId: number, perms: string[]): void {
    // PERF FIX: evict oldest when at capacity
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value as number;
      this.cache.delete(oldestKey);
    }
    this.cache.set(userId, { perms, exp: Date.now() + this.TTL_MS });
  }

  invalidate(userId: number): void {
    this.cache.delete(userId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
