import {
  CacheInterceptor,
  Controller,
  Get,
  Query,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import * as moment from 'moment';
import { createZodDto, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';

import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../../domain/commands/get-availaiblity.query';
import { CacheService } from '../../common/services/cache.service';

const GetAvailabilitySchema = z.object({
  placeId: z.string(),
  date: z
    .string()
    .regex(/\d{4}-\d{2}-\d{2}/)
    .refine((date) => moment(date).isValid())
    .transform((date) => moment(date).toDate()),
});

class GetAvailabilityDTO extends createZodDto(GetAvailabilitySchema) {}

@Controller('search')
@UseInterceptors(CacheInterceptor)
export class SearchController {
  constructor(private queryBus: QueryBus, private cacheService: CacheService) {}

  @Get()
  @UsePipes(ZodValidationPipe)
  async searchAvailability(
    @Query() query: GetAvailabilityDTO,
  ): Promise<ClubWithAvailability[]> {
    const cacheKey = `search:${query.placeId}:${query.date}`;
    const cachedData = this.cacheService.get<ClubWithAvailability[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const result = await this.queryBus.execute(
      new GetAvailabilityQuery(query.placeId, query.date),
    );

    this.cacheService.set(cacheKey, result);
    return result;
  }
}
