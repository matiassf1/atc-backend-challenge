import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';
import { PerformanceService } from '../../common/services/performance.service';
import { CacheService } from '../../common/services/cache.service';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  private readonly logger = new Logger(GetAvailabilityHandler.name);
  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient: AlquilaTuCanchaClient,
    private performanceService: PerformanceService,
    private cacheService: CacheService,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    const cacheKey = `availability:${query.placeId}:${query.date}`;
    const cachedData = this.cacheService.get<ClubWithAvailability[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    this.logger.debug(`Cache MISS: ${cacheKey}, fetching from API`);

    const startTime = Date.now();
    let apiCalls = 0;
    let cacheHit = false;

    try {
      const clubs = await this.alquilaTuCanchaClient.getClubs(query.placeId);
      const clubs_with_availability = await Promise.all(
        clubs.map(async (club) => {
          const courts = await this.alquilaTuCanchaClient.getCourts(club.id);

          const courts_with_availability = await Promise.all(
            courts.map(async (court) => {
              const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
                club.id,
                court.id,
                query.date,
              );
              return {
                ...court,
                available: slots,
              };
            }),
          );
          const totalTime = Date.now() - startTime;

          // Registrar métricas
          this.performanceService.recordMetrics({
            endpoint: 'get-availability',
            responseTime: totalTime,
            timestamp: new Date(),
            cacheHit,
            apiCalls,
            totalTime,
          });

          return {
            ...club,
            courts: courts_with_availability,
          };
        }),
      );
      this.cacheService.set(cacheKey, clubs_with_availability, 30 * 1000);
      return clubs_with_availability;
    } catch (error) {
      const totalTime = Date.now() - startTime;

      this.performanceService.recordMetrics({
        endpoint: 'get-availability',
        responseTime: totalTime,
        timestamp: new Date(),
        cacheHit,
        apiCalls,
        totalTime,
      });
      throw new Error('Error getting availability');
    }
  }
}
