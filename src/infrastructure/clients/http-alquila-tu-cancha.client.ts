import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;
  constructor(
    private httpService: HttpService,
    config: ConfigService,
    private cacheService: CacheService,
  ) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
  }

  async getClubs(placeId: string): Promise<Club[]> {
    const cacheKey = `clubs_${placeId}`;
    const cachedData = this.cacheService.get<Club[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.httpService.axiosRef
        .get('clubs', {
          baseURL: this.base_url,
          params: { placeId },
        })
        .then((res) => res.data);

      this.cacheService.set(cacheKey, response);
      return response;
    } catch (error) {
      throw new Error('Error getting clubs');
    }
  }

  async getCourts(clubId: number): Promise<Court[]> {
    const cacheKey = `courts_${clubId}`;
    const cachedData = this.cacheService.get<Court[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.httpService.axiosRef
        .get(`/clubs/${clubId}/courts`, {
          baseURL: this.base_url,
        })
        .then((res) => res.data);

      this.cacheService.set(cacheKey, response);
      return response;
    } catch (error) {
      throw new Error('Error getting courts');
    }
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const cacheKey = `slots_${clubId}_${courtId}_${date}`;
    const cachedData = this.cacheService.get<Slot[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.httpService.axiosRef
        .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
          baseURL: this.base_url,
          params: { date: moment(date).format('YYYY-MM-DD') },
        })
        .then((res) => res.data);

      this.cacheService.set(cacheKey, response);
      return response;
    } catch (error) {
      throw new Error('Error getting available slots');
    }
  }
}
