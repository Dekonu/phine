import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Interface representing API usage metrics.
 */
export interface ApiMetrics {
  totalRequests: number;
  requestsToday: number;
  avgResponseTime: number;
  successRate: number;
  usageData: Array<{ date: string; count: number }>;
}

/**
 * Service for retrieving and calculating API usage metrics.
 * Aggregates data from the api_usage table to provide insights into API performance.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Retrieves comprehensive API metrics including total requests, daily requests,
   * average response time, success rate, and usage data for the last 7 days.
   *
   * @returns Promise resolving to ApiMetrics object with aggregated statistics
   */
  async getApiMetrics(): Promise<ApiMetrics> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: allUsageData, error: allUsageError } = await this.supabaseService
        .getClient()
        .from('api_usage')
        .select('*');

      if (allUsageError) {
        this.logger.error('Error fetching usage data from database', allUsageError);
        throw allUsageError;
      }

      const allUsage = (allUsageData || []).map((row) => ({
        keyId: row.key_id,
        timestamp: new Date(row.timestamp).toISOString(),
        responseTime: row.response_time,
        success: row.success,
      }));

      const todayUsage = allUsage.filter(
        (usage) => new Date(usage.timestamp) >= todayStart,
      );
      const last7DaysUsage = allUsage.filter(
        (usage) => new Date(usage.timestamp) >= sevenDaysAgo,
      );

      const totalRequests = allUsage.length;
      const requestsToday = todayUsage.length;

      const successfulRequests = allUsage.filter((usage) => usage.success).length;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

      const responseTimes = allUsage
        .filter((usage) => usage.responseTime !== undefined)
        .map((usage) => usage.responseTime!);
      const avgResponseTime =
        responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0;

      const usageData: Array<{ date: string; count: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const count = last7DaysUsage.filter((usage) => {
          const usageDate = new Date(usage.timestamp);
          return usageDate >= dayStart && usageDate < dayEnd;
        }).length;

        usageData.push({ date: dateStr, count });
      }

      return {
        totalRequests,
        requestsToday,
        avgResponseTime,
        successRate: Math.round(successRate * 10) / 10,
        usageData,
      };
    } catch (error) {
      this.logger.error(
        'Failed to get API metrics',
        error instanceof Error ? error.stack : error,
      );
      return {
        totalRequests: 0,
        requestsToday: 0,
        avgResponseTime: 0,
        successRate: 0,
        usageData: [],
      };
    }
  }
}

