import { Injectable } from '@nestjs/common';

export interface GitHubRateLimitStatus {
  limit: number;
  remaining: number;
  used: number;
  reset: number; // UTC epoch seconds
  resource: string;
}

export interface RateLimitCheckResult {
  canProceed: boolean;
  waitTime?: number; // seconds to wait
  status?: GitHubRateLimitStatus;
  error?: string;
}

@Injectable()
export class GitHubRateLimitService {
  private rateLimitCache: Map<string, GitHubRateLimitStatus> = new Map();
  private readonly CACHE_TTL = 60; // Cache rate limit status for 60 seconds
  private readonly MIN_REMAINING_THRESHOLD = 10; // Don't proceed if less than 10 requests remaining

  /**
   * Check GitHub API rate limit status
   * Uses the /rate_limit endpoint which doesn't count against rate limits
   */
  async checkRateLimit(accessToken?: string): Promise<RateLimitCheckResult> {
    try {
      const cacheKey = accessToken || 'unauthenticated';
      const cached = this.rateLimitCache.get(cacheKey);

      // Return cached result if still valid
      if (cached && Date.now() / 1000 < cached.reset - this.CACHE_TTL) {
        return this.evaluateRateLimit(cached);
      }

      // Fetch fresh rate limit status
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch('https://api.github.com/rate_limit', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        // If we can't check rate limit, allow proceeding but log warning
        console.warn('Failed to check GitHub rate limit:', response.status);
        return { canProceed: true };
      }

      const data = await response.json();
      const core = data.resources?.core || data; // Handle both response formats

      const status: GitHubRateLimitStatus = {
        limit: core.limit || 60,
        remaining: core.remaining || 0,
        used: core.used || 0,
        reset: core.reset || Math.floor(Date.now() / 1000) + 3600,
        resource: core.resource || 'core',
      };

      // Cache the result
      this.rateLimitCache.set(cacheKey, status);

      return this.evaluateRateLimit(status);
    } catch (error) {
      // If rate limit check fails, allow proceeding but log error
      console.error('Error checking GitHub rate limit:', error);
      return { canProceed: true };
    }
  }

  /**
   * Evaluate if we can proceed based on rate limit status
   */
  private evaluateRateLimit(status: GitHubRateLimitStatus): RateLimitCheckResult {
    const now = Math.floor(Date.now() / 1000);
    const timeUntilReset = status.reset - now;

    // If we've exceeded the limit, wait until reset
    if (status.remaining === 0) {
      return {
        canProceed: false,
        waitTime: Math.max(timeUntilReset, 60), // At least 60 seconds
        status,
        error: `GitHub API rate limit exceeded. Limit resets at ${new Date(status.reset * 1000).toISOString()}`,
      };
    }

    // If we're close to the limit, warn but allow
    if (status.remaining < this.MIN_REMAINING_THRESHOLD) {
      return {
        canProceed: true,
        waitTime: timeUntilReset,
        status,
        error: `Warning: Only ${status.remaining} GitHub API requests remaining. Limit resets at ${new Date(status.reset * 1000).toISOString()}`,
      };
    }

    return {
      canProceed: true,
      status,
    };
  }

  /**
   * Handle rate limit error and calculate retry time
   */
  handleRateLimitError(error: any): { shouldRetry: boolean; waitTime: number; error: string } {
    if (!(error instanceof Error)) {
      return { shouldRetry: false, waitTime: 0, error: 'Unknown error' };
    }

    const errorMessage = error.message.toLowerCase();
    const isRateLimitError =
      errorMessage.includes('rate limit') ||
      errorMessage.includes('403') ||
      errorMessage.includes('429') ||
      errorMessage.includes('too many requests');

    if (!isRateLimitError) {
      return { shouldRetry: false, waitTime: 0, error: error.message };
    }

    // Try to extract retry-after from error if available
    let waitTime = 60; // Default to 60 seconds

    // Check if error has retry-after information
    if (errorMessage.includes('retry after')) {
      const match = errorMessage.match(/retry[-\s]after[:\s]+(\d+)/i);
      if (match) {
        waitTime = parseInt(match[1], 10);
      }
    }

    // Check cached rate limit status for reset time
    const cached = Array.from(this.rateLimitCache.values())[0];
    if (cached) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilReset = cached.reset - now;
      if (timeUntilReset > 0) {
        waitTime = Math.max(waitTime, timeUntilReset);
      }
    }

    return {
      shouldRetry: true,
      waitTime: Math.min(waitTime, 3600), // Cap at 1 hour
      error: `GitHub API rate limit exceeded. Retry after ${waitTime} seconds.`,
    };
  }

  /**
   * Clear rate limit cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.rateLimitCache.clear();
  }
}

