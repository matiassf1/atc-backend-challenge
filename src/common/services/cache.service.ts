import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  private readonly cache = new Map<string, { data: any; expiry: number }>();
  private readonly defaultTTL = 5 * 60 * 1000;

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.logger.log(`Setting cache for key: ${key}`);
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });

    this.cleanup();
  }

  get<T>(key: string): T | null {
    this.logger.log(`Getting cache for key: ${key}`);
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  private cleanup(): void {
    this.logger.log('Cleaning up cache');
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        this.logger.log(`Deleted cache for key: ${key}`);
      }
    }
  }
}
