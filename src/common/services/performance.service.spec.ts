import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceService, PerformanceMetrics } from './performance.service';

describe('PerformanceService', () => {
  let service: PerformanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceService],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordMetrics', () => {
    it('should record metrics correctly', () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: 150,
        timestamp: new Date(),
        cacheHit: true,
        apiCalls: 3,
        totalTime: 200,
      };

      service.recordMetrics(metrics);
      const allMetrics = service.getMetrics();

      expect(allMetrics).toHaveLength(1);
      expect(allMetrics[0]).toEqual(metrics);
    });

    it('should record multiple metrics', () => {
      const metrics1: PerformanceMetrics = {
        endpoint: '/test1',
        responseTime: 100,
        timestamp: new Date(),
        cacheHit: false,
        apiCalls: 5,
        totalTime: 120,
      };

      const metrics2: PerformanceMetrics = {
        endpoint: '/test2',
        responseTime: 200,
        timestamp: new Date(),
        cacheHit: true,
        apiCalls: 2,
        totalTime: 250,
      };

      service.recordMetrics(metrics1);
      service.recordMetrics(metrics2);

      const allMetrics = service.getMetrics();
      expect(allMetrics).toHaveLength(2);
    });

    it('should handle metrics without optional fields', () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: 100,
        timestamp: new Date(),
        apiCalls: 1,
        totalTime: 100,
        // cacheHit is optional
      };

      service.recordMetrics(metrics);
      const allMetrics = service.getMetrics();

      expect(allMetrics).toHaveLength(1);
      expect(allMetrics[0].cacheHit).toBeUndefined();
    });
  });

  describe('getAverageResponseTime', () => {
    it('should return 0 for non-existent endpoint', () => {
      const avgTime = service.getAverageResponseTime('/non-existent');
      expect(avgTime).toBe(0);
    });

    it('should calculate average for single metric', () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: 150,
        timestamp: new Date(),
        apiCalls: 1,
        totalTime: 150,
      };

      service.recordMetrics(metrics);
      const avgTime = service.getAverageResponseTime('/test');

      expect(avgTime).toBe(150);
    });

    it('should calculate average for multiple metrics', () => {
      const metrics: PerformanceMetrics[] = [
        {
          endpoint: '/test',
          responseTime: 100,
          timestamp: new Date(),
          apiCalls: 1,
          totalTime: 100,
        },
        {
          endpoint: '/test',
          responseTime: 200,
          timestamp: new Date(),
          apiCalls: 1,
          totalTime: 200,
        },
        {
          endpoint: '/test',
          responseTime: 300,
          timestamp: new Date(),
          apiCalls: 1,
          totalTime: 300,
        },
      ];

      metrics.forEach((m) => service.recordMetrics(m));
      const avgTime = service.getAverageResponseTime('/test');

      expect(avgTime).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should handle decimal averages', () => {
      const metrics: PerformanceMetrics[] = [
        {
          endpoint: '/test',
          responseTime: 100,
          timestamp: new Date(),
          apiCalls: 1,
          totalTime: 100,
        },
        {
          endpoint: '/test',
          responseTime: 101,
          timestamp: new Date(),
          apiCalls: 1,
          totalTime: 101,
        },
      ];

      metrics.forEach((m) => service.recordMetrics(m));
      const avgTime = service.getAverageResponseTime('/test');

      expect(avgTime).toBe(100.5);
    });
  });

  describe('getCacheHitRate', () => {
    it('should return 0 for non-existent endpoint', () => {
      const hitRate = service.getCacheHitRate('/non-existent');
      expect(hitRate).toBe(0);
    });

    it('should return 100% for all cache hits', () => {
      const metrics: PerformanceMetrics[] = [
        {
          endpoint: '/test',
          responseTime: 100,
          timestamp: new Date(),
          cacheHit: true,
          apiCalls: 1,
          totalTime: 100,
        },
        {
          endpoint: '/test',
          responseTime: 150,
          timestamp: new Date(),
          cacheHit: true,
          apiCalls: 1,
          totalTime: 150,
        },
      ];

      metrics.forEach((m) => service.recordMetrics(m));
      const hitRate = service.getCacheHitRate('/test');

      expect(hitRate).toBe(100);
    });

    it('should return 0% for all cache misses', () => {
      const metrics: PerformanceMetrics[] = [
        {
          endpoint: '/test',
          responseTime: 100,
          timestamp: new Date(),
          cacheHit: false,
          apiCalls: 1,
          totalTime: 100,
        },
        {
          endpoint: '/test',
          responseTime: 150,
          timestamp: new Date(),
          cacheHit: false,
          apiCalls: 1,
          totalTime: 150,
        },
      ];

      metrics.forEach((m) => service.recordMetrics(m));
      const hitRate = service.getCacheHitRate('/test');

      expect(hitRate).toBe(0);
    });

    it('should calculate mixed cache hit rate', () => {
      const metrics: PerformanceMetrics[] = [
        {
          endpoint: '/test',
          responseTime: 100,
          timestamp: new Date(),
          cacheHit: true,
          apiCalls: 1,
          totalTime: 100,
        },
        {
          endpoint: '/test',
          responseTime: 150,
          timestamp: new Date(),
          cacheHit: false,
          apiCalls: 1,
          totalTime: 150,
        },
        {
          endpoint: '/test',
          responseTime: 200,
          timestamp: new Date(),
          cacheHit: true,
          apiCalls: 1,
          totalTime: 200,
        },
      ];

      metrics.forEach((m) => service.recordMetrics(m));
      const hitRate = service.getCacheHitRate('/test');

      expect(hitRate).toBeCloseTo(66.67, 2); // 2 hits out of 3 = 66.67%
    });

    it('should handle metrics without cacheHit field', () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: 100,
        timestamp: new Date(),
        apiCalls: 1,
        totalTime: 100,
        // cacheHit is undefined
      };

      service.recordMetrics(metrics);
      const hitRate = service.getCacheHitRate('/test');

      expect(hitRate).toBe(0); // undefined cacheHit counts as miss
    });
  });

  describe('getMetrics', () => {
    it('should return empty array initially', () => {
      const metrics = service.getMetrics();
      expect(metrics).toEqual([]);
    });

    it('should return copy of metrics array', () => {
      const originalMetrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: 100,
        timestamp: new Date(),
        apiCalls: 1,
        totalTime: 100,
      };

      service.recordMetrics(originalMetrics);
      const returnedMetrics = service.getMetrics();

      expect(returnedMetrics).toHaveLength(1);
      expect(returnedMetrics[0]).toEqual(originalMetrics);

      // Modifying returned array should not affect service
      returnedMetrics.push(originalMetrics);
      expect(service.getMetrics()).toHaveLength(1);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all metrics', () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: 100,
        timestamp: new Date(),
        apiCalls: 1,
        totalTime: 100,
      };

      service.recordMetrics(metrics);
      expect(service.getMetrics()).toHaveLength(1);

      service.clearMetrics();
      expect(service.getMetrics()).toHaveLength(0);
    });

    it('should reset average response time after clear', () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: 100,
        timestamp: new Date(),
        apiCalls: 1,
        totalTime: 100,
      };

      service.recordMetrics(metrics);
      expect(service.getAverageResponseTime('/test')).toBe(100);

      service.clearMetrics();
      expect(service.getAverageResponseTime('/test')).toBe(0);
    });

    it('should reset cache hit rate after clear', () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: 100,
        timestamp: new Date(),
        cacheHit: true,
        apiCalls: 1,
        totalTime: 100,
      };

      service.recordMetrics(metrics);
      expect(service.getCacheHitRate('/test')).toBe(100);

      service.clearMetrics();
      expect(service.getCacheHitRate('/test')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very large response times', () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: Number.MAX_SAFE_INTEGER,
        timestamp: new Date(),
        apiCalls: 1,
        totalTime: Number.MAX_SAFE_INTEGER,
      };

      service.recordMetrics(metrics);
      const avgTime = service.getAverageResponseTime('/test');

      expect(avgTime).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle zero response time', () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: 0,
        timestamp: new Date(),
        apiCalls: 1,
        totalTime: 0,
      };

      service.recordMetrics(metrics);
      const avgTime = service.getAverageResponseTime('/test');

      expect(avgTime).toBe(0);
    });

    it('should handle negative response time', () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/test',
        responseTime: -100,
        timestamp: new Date(),
        apiCalls: 1,
        totalTime: -100,
      };

      service.recordMetrics(metrics);
      const avgTime = service.getAverageResponseTime('/test');

      expect(avgTime).toBe(-100);
    });
  });
});
