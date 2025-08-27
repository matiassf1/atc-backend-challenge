import { Injectable, Logger } from '@nestjs/common';

export interface PerformanceMetrics {
  endpoint: string;
  responseTime: number;
  timestamp: Date;
  cacheHit?: boolean;
  apiCalls: number;
  totalTime: number;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private readonly metrics: PerformanceMetrics[] = [];

  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    this.logger.log(
      `Performance: ${metrics.endpoint} - ${metrics.responseTime}ms - Cache: ${
        metrics.cacheHit ? 'HIT' : 'MISS'
      } - API Calls: ${metrics.apiCalls}`,
    );
  }

  getAverageResponseTime(endpoint: string): number {
    const endpointMetrics = this.metrics.filter((m) => m.endpoint === endpoint);
    if (endpointMetrics.length === 0) return 0;

    const total = endpointMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    return total / endpointMetrics.length;
  }

  getCacheHitRate(endpoint: string): number {
    const endpointMetrics = this.metrics.filter((m) => m.endpoint === endpoint);
    if (endpointMetrics.length === 0) return 0;

    const hits = endpointMetrics.filter((m) => m.cacheHit).length;
    return (hits / endpointMetrics.length) * 100;
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics.length = 0;
  }
}
