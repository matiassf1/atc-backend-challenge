import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set', () => {
    it('should set cache data with default TTL', () => {
      const key = 'test-key';
      const data = { test: 'data' };

      service.set(key, data);

      const result = service.get(key);
      expect(result).toEqual(data);
    });

    it('should set cache data with custom TTL', () => {
      const key = 'test-key-custom-ttl';
      const data = { test: 'data' };
      const customTTL = 1000; // 1 second

      service.set(key, data, customTTL);

      const result = service.get(key);
      expect(result).toEqual(data);
    });

    it('should overwrite existing cache data', () => {
      const key = 'test-key-overwrite';
      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };

      service.set(key, data1);
      service.set(key, data2);

      const result = service.get(key);
      expect(result).toEqual(data2);
    });
  });

  describe('get', () => {
    it('should return null for non-existent key', () => {
      const result = service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should return cached data for valid key', () => {
      const key = 'test-key-get';
      const data = { test: 'data' };

      service.set(key, data);
      const result = service.get(key);

      expect(result).toEqual(data);
    });

    it('should return null for expired data', async () => {
      const key = 'test-key-expired';
      const data = { test: 'data' };
      const shortTTL = 10; // 10ms

      service.set(key, data, shortTTL);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 20));

      const result = service.get(key);
      expect(result).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries automatically', async () => {
      const key1 = 'test-key-valid';
      const key2 = 'test-key-expired';
      const data = { test: 'data' };

      // Set one valid entry and one expired entry
      service.set(key1, data, 5000); // 5 seconds
      service.set(key2, data, 10); // 10ms

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Trigger cleanup by setting new data
      service.set('trigger-cleanup', data);

      // Check that expired entry was removed
      expect(service.get(key1)).toEqual(data); // Still valid
      expect(service.get(key2)).toBeNull(); // Expired and removed
    });

    it('should handle multiple expired entries', async () => {
      const keys = ['expired1', 'expired2', 'expired3'];
      const data = { test: 'data' };

      // Set multiple expired entries
      keys.forEach((key) => service.set(key, data, 10));

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Trigger cleanup
      service.set('trigger', data);

      // All expired entries should be removed
      keys.forEach((key) => {
        expect(service.get(key)).toBeNull();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined data', () => {
      const key1 = 'test-null';
      const key2 = 'test-undefined';

      service.set(key1, null);
      service.set(key2, undefined);

      expect(service.get(key1)).toBeNull();
      expect(service.get(key2)).toBeUndefined();
    });

    it('should handle empty string key', () => {
      const key = '';
      const data = { test: 'data' };

      service.set(key, data);
      const result = service.get(key);

      expect(result).toEqual(data);
    });

    it('should handle very long TTL', () => {
      const key = 'test-long-ttl';
      const data = { test: 'data' };
      const longTTL = 365 * 24 * 60 * 60 * 1000; // 1 year

      service.set(key, data, longTTL);
      const result = service.get(key);

      expect(result).toEqual(data);
    });
  });
});
