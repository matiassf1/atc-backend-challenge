import { HttpModule } from '@nestjs/axios';
import { CACHE_MANAGER, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { CacheService } from './common/services/cache.service';
import { ClubUpdatedHandler } from './domain/handlers/club-updated.handler';
import { GetAvailabilityHandler } from './domain/handlers/get-availability.handler';
import { ALQUILA_TU_CANCHA_CLIENT } from './domain/ports/aquila-tu-cancha.client';
import { HTTPAlquilaTuCanchaClient } from './infrastructure/clients/http-alquila-tu-cancha.client';
import { EventsController } from './infrastructure/controllers/events.controller';
import { SearchController } from './infrastructure/controllers/search.controller';
import { PerformanceService } from './common/services/performance.service';

@Module({
  imports: [HttpModule, CqrsModule, ConfigModule.forRoot()],
  controllers: [SearchController, EventsController],
  providers: [
    {
      provide: ALQUILA_TU_CANCHA_CLIENT,
      useClass: HTTPAlquilaTuCanchaClient,
    },
    GetAvailabilityHandler,
    {
      provide: CACHE_MANAGER,
      useClass: CacheService,
    },
    ClubUpdatedHandler,
    CacheService,
    PerformanceService,
  ],
})
export class AppModule {}
