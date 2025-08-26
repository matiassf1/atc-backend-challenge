import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  CacheInterceptor,
  Logger,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { UseZodGuard } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { CacheService } from '../../common/services/cache.service';

import { ClubUpdatedEvent } from '../../domain/events/club-updated.event';
import { CourtUpdatedEvent } from '../../domain/events/court-updated.event';
import { SlotBookedEvent } from '../../domain/events/slot-booked.event';
import { SlotAvailableEvent } from '../../domain/events/slot-cancelled.event';

const SlotSchema = z.object({
  price: z.number(),
  duration: z.number(),
  datetime: z.string(),
  start: z.string(),
  end: z.string(),
  _priority: z.number(),
});

export const ExternalEventSchema = z.union([
  z.object({
    type: z.enum(['booking_cancelled', 'booking_created']),
    clubId: z.number().int(),
    courtId: z.number().int(),
    slot: SlotSchema,
  }),
  z.object({
    type: z.literal('club_updated'),
    clubId: z.number().int(),
    fields: z.array(
      z.enum(['attributes', 'openhours', 'logo_url', 'background_url']),
    ),
  }),
  z.object({
    type: z.literal('court_updated'),
    clubId: z.number().int(),
    courtId: z.number().int(),
    fields: z.array(z.enum(['attributes', 'name'])),
  }),
]);

export type ExternalEventDTO = z.infer<typeof ExternalEventSchema>;

@Controller('events')
@UseInterceptors(CacheInterceptor)
export class EventsController {
  private readonly logger = new Logger(EventsController.name);
  constructor(private eventBus: EventBus, private cacheService: CacheService) {}

  @Post()
  @UseZodGuard('body', ExternalEventSchema)
  async receiveEvent(@Body() externalEvent: ExternalEventDTO) {
    const cacheKey = `event:${externalEvent.type}:${
      externalEvent.clubId
    }:${Date.now()}`;

    if (this.cacheService.get(cacheKey)) {
      return { message: 'Event already processed' };
    }

    this.cacheService.set(cacheKey, true, 1000);

    try {
      switch (externalEvent.type) {
        case 'booking_created':
          await this.handleBookingCreated(externalEvent);
          break;
        case 'booking_cancelled':
          await this.handleBookingCancelled(externalEvent);
          break;
        case 'club_updated':
          await this.handleClubUpdated(externalEvent);
          break;
        case 'court_updated':
          await this.handleCourtUpdated(externalEvent);
          break;
      }

      return { success: true, message: 'Event processed successfully' };
    } catch (error) {
      this.logger.error(`Error processing event: ${error}`);
      throw error;
    }
  }

  private async handleBookingCreated(event: any) {
    setImmediate(() => {
      this.eventBus.publish(
        new SlotBookedEvent(event.clubId, event.courtId, event.slot),
      );
    });
  }

  private async handleBookingCancelled(event: any) {
    setImmediate(() => {
      this.eventBus.publish(
        new SlotAvailableEvent(event.clubId, event.courtId, event.slot),
      );
    });
  }

  private async handleClubUpdated(event: any) {
    setImmediate(() => {
      this.eventBus.publish(new ClubUpdatedEvent(event.clubId, event.fields));
    });
  }

  private async handleCourtUpdated(event: any) {
    setImmediate(() => {
      this.eventBus.publish(
        new CourtUpdatedEvent(event.clubId, event.courtId, event.fields),
      );
    });
  }
}
