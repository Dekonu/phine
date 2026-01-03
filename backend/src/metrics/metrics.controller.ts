import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * Controller for API metrics.
 * Provides endpoint to retrieve aggregated API usage statistics and analytics.
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Retrieves comprehensive API metrics including total requests, daily requests,
   * average response time, success rate, and usage data for the last 7 days.
   *
   * @returns Promise resolving to ApiMetrics object with aggregated statistics
   */
  @Get()
  async getMetrics() {
    return this.metricsService.getApiMetrics();
  }
}

