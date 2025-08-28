import * as moment from 'moment';
import { Test, TestingModule } from '@nestjs/testing';

import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { GetAvailabilityQuery } from '../commands/get-availaiblity.query';
import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';
import { GetAvailabilityHandler } from './get-availability.handler';
import { CacheService } from '../../common/services/cache.service';
import { PerformanceService } from '../../common/services/performance.service';
import { ALQUILA_TU_CANCHA_CLIENT } from '../ports/aquila-tu-cancha.client';

describe('GetAvailabilityHandler', () => {
  let handler: GetAvailabilityHandler;
  let mockClient: jest.Mocked<AlquilaTuCanchaClient>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockPerformanceService: jest.Mocked<PerformanceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAvailabilityHandler,
        {
          provide: ALQUILA_TU_CANCHA_CLIENT,
          useValue: createMockAlquilaTuCanchaClient(),
        },
        {
          provide: CacheService,
          useValue: createMockCacheService(),
        },
        {
          provide: PerformanceService,
          useValue: createMockPerformanceService(),
        },
      ],
    }).compile();

    handler = module.get<GetAvailabilityHandler>(GetAvailabilityHandler);
    mockClient = module.get(ALQUILA_TU_CANCHA_CLIENT);
    mockCacheService = module.get(CacheService);
    mockPerformanceService = module.get(PerformanceService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('cache functionality', () => {
    it('should return cached data when available', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();
      const cachedData = [{ id: 1, courts: [{ id: 1, available: [] }] }];

      mockCacheService.get.mockReturnValue(cachedData);

      const response = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );

      expect(response).toEqual(cachedData);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `availability:${placeId}:${date}`,
      );
      expect(mockClient.getClubs).not.toHaveBeenCalled();
    });

    it('should fetch fresh data when cache miss', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      mockCacheService.get.mockReturnValue(null);
      mockClient.getClubs.mockResolvedValue([{ id: 1 }]);
      mockClient.getCourts.mockResolvedValue([{ id: 1 }]);
      mockClient.getAvailableSlots.mockResolvedValue([]);

      const response = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );

      expect(response).toEqual([{ id: 1, courts: [{ id: 1, available: [] }] }]);
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockClient.getClubs).toHaveBeenCalledWith(placeId);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should set cache with correct key and TTL', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      mockCacheService.get.mockReturnValue(null);
      mockClient.getClubs.mockResolvedValue([{ id: 1 }]);
      mockClient.getCourts.mockResolvedValue([{ id: 1 }]);
      mockClient.getAvailableSlots.mockResolvedValue([]);

      await handler.execute(new GetAvailabilityQuery(placeId, date));

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `availability:${placeId}:${date}`,
        expect.any(Array),
        30000, // 30 seconds TTL
      );
    });
  });

  describe('performance metrics', () => {
    it('should NOT record performance metrics for cache hit (current implementation)', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();
      const cachedData = [{ id: 1, courts: [{ id: 1, available: [] }] }];

      mockCacheService.get.mockReturnValue(cachedData);

      await handler.execute(new GetAvailabilityQuery(placeId, date));

      // Current implementation doesn't record metrics for cache hits
      expect(mockPerformanceService.recordMetrics).not.toHaveBeenCalled();
    });

    it('should record performance metrics for cache miss', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      mockCacheService.get.mockReturnValue(null);
      mockClient.getClubs.mockResolvedValue([{ id: 1 }]);
      mockClient.getCourts.mockResolvedValue([{ id: 1 }]);
      mockClient.getAvailableSlots.mockResolvedValue([]);

      await handler.execute(new GetAvailabilityQuery(placeId, date));

      expect(mockPerformanceService.recordMetrics).toHaveBeenCalledWith({
        endpoint: 'get-availability',
        responseTime: expect.any(Number),
        timestamp: expect.any(Date),
        cacheHit: false,
        apiCalls: 0,
        totalTime: expect.any(Number),
      });
    });

    it('should record metrics even when error occurs', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      mockCacheService.get.mockReturnValue(null);
      mockClient.getClubs.mockRejectedValue(new Error('API Error'));

      await expect(
        handler.execute(new GetAvailabilityQuery(placeId, date)),
      ).rejects.toThrow('Error getting availability');

      expect(mockPerformanceService.recordMetrics).toHaveBeenCalledWith({
        endpoint: 'get-availability',
        responseTime: expect.any(Number),
        timestamp: expect.any(Date),
        cacheHit: false,
        apiCalls: 0,
        totalTime: expect.any(Number),
      });
    });
  });

  describe('data fetching', () => {
    it('should return the availability with correct structure', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      mockCacheService.get.mockReturnValue(null);
      mockClient.getClubs.mockResolvedValue([{ id: 1 }]);
      mockClient.getCourts.mockResolvedValue([{ id: 1 }]);
      mockClient.getAvailableSlots.mockResolvedValue([
        {
          price: 10,
          duration: 60,
          datetime: '2022-12-05',
          start: '10:00',
          end: '11:00',
          _priority: 1,
        },
      ]);

      const response = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );

      expect(response).toEqual([
        {
          id: 1,
          courts: [
            {
              id: 1,
              available: [
                {
                  price: 10,
                  duration: 60,
                  datetime: '2022-12-05',
                  start: '10:00',
                  end: '11:00',
                  _priority: 1,
                },
              ],
            },
          ],
        },
      ]);
    });

    it('should handle multiple clubs and courts', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      mockCacheService.get.mockReturnValue(null);
      mockClient.getClubs.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      // Mock getCourts to return different courts for each club
      mockClient.getCourts
        .mockResolvedValueOnce([{ id: 1 }]) // First club gets court 1
        .mockResolvedValueOnce([{ id: 2 }]); // Second club gets court 2

      // Mock getAvailableSlots for each club-court combination
      mockClient.getAvailableSlots
        .mockResolvedValueOnce([
          {
            price: 10,
            duration: 60,
            datetime: '2022-12-05',
            start: '10:00',
            end: '11:00',
            _priority: 1,
          },
        ])
        .mockResolvedValueOnce([
          {
            price: 15,
            duration: 60,
            datetime: '2022-12-05',
            start: '11:00',
            end: '12:00',
            _priority: 1,
          },
        ]);

      const response = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );

      expect(response).toHaveLength(2);
      expect(response[0].courts).toHaveLength(1);
      expect(response[1].courts).toHaveLength(1);
    });

    it('should handle empty results', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      mockCacheService.get.mockReturnValue(null);
      mockClient.getClubs.mockResolvedValue([]);

      const response = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );

      expect(response).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw error when API fails', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      mockCacheService.get.mockReturnValue(null);
      mockClient.getClubs.mockRejectedValue(new Error('Network error'));

      await expect(
        handler.execute(new GetAvailabilityQuery(placeId, date)),
      ).rejects.toThrow('Error getting availability');
    });

    it('should handle partial failures gracefully', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      mockCacheService.get.mockReturnValue(null);
      mockClient.getClubs.mockResolvedValue([{ id: 1 }]);
      mockClient.getCourts.mockResolvedValue([{ id: 1 }]);
      mockClient.getAvailableSlots.mockResolvedValue([]);

      // Simulate partial failure
      mockClient.getAvailableSlots.mockRejectedValueOnce(
        new Error('Court error'),
      );

      await expect(
        handler.execute(new GetAvailabilityQuery(placeId, date)),
      ).rejects.toThrow('Error getting availability');
    });
  });

  describe('integration scenarios', () => {
    it('should handle cache hit then miss scenario', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      // First call: cache hit
      const cachedData = [{ id: 1, courts: [{ id: 1, available: [] }] }];
      mockCacheService.get.mockReturnValueOnce(cachedData);

      const response1 = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );
      expect(response1).toEqual(cachedData);
      expect(mockClient.getClubs).not.toHaveBeenCalled();

      // Second call: cache miss
      mockCacheService.get.mockReturnValueOnce(null);
      mockClient.getClubs.mockResolvedValue([{ id: 1 }]);
      mockClient.getCourts.mockResolvedValue([{ id: 1 }]);
      mockClient.getAvailableSlots.mockResolvedValue([]);

      const response2 = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );
      expect(response2).toEqual([
        { id: 1, courts: [{ id: 1, available: [] }] },
      ]);
      expect(mockClient.getClubs).toHaveBeenCalledWith(placeId);
    });

    it('should maintain cache consistency across calls', async () => {
      const placeId = '123';
      const date = moment('2022-12-05').toDate();

      // First call: cache miss, fetch data
      mockCacheService.get.mockReturnValueOnce(null);
      mockClient.getClubs.mockResolvedValue([{ id: 1 }]);
      mockClient.getCourts.mockResolvedValue([{ id: 1 }]);
      mockClient.getAvailableSlots.mockResolvedValue([]);

      await handler.execute(new GetAvailabilityQuery(placeId, date));

      // Verify cache was set
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `availability:${placeId}:${date}`,
        expect.any(Array),
        30000,
      );

      // Second call: should hit cache
      mockCacheService.get.mockReturnValueOnce([
        { id: 1, courts: [{ id: 1, available: [] }] },
      ]);

      const response2 = await handler.execute(
        new GetAvailabilityQuery(placeId, date),
      );

      expect(response2).toEqual([
        { id: 1, courts: [{ id: 1, available: [] }] },
      ]);
    });
  });
});

// Mock implementations
function createMockAlquilaTuCanchaClient(): jest.Mocked<AlquilaTuCanchaClient> {
  return {
    getClubs: jest.fn(),
    getCourts: jest.fn(),
    getAvailableSlots: jest.fn(),
  };
}

function createMockCacheService(): jest.Mocked<CacheService> {
  return {
    set: jest.fn(),
    get: jest.fn(),
  } as unknown as jest.Mocked<CacheService>;
}

function createMockPerformanceService(): jest.Mocked<PerformanceService> {
  return {
    recordMetrics: jest.fn(),
    getAverageResponseTime: jest.fn(),
    getCacheHitRate: jest.fn(),
    getMetrics: jest.fn(),
    clearMetrics: jest.fn(),
  } as unknown as jest.Mocked<PerformanceService>;
}
