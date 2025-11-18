import { Injectable } from '@nestjs/common';
import { GitHubSummarizerResponse } from './schemas/github-summarizer-response.schema';

interface CacheEntry {
  data: GitHubSummarizerResponse;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

@Injectable()
export class GitHubCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get cached repository summary
   */
  get(repoUrl: string): GitHubSummarizerResponse | null {
    const normalizedUrl = this.normalizeUrl(repoUrl);
    const entry = this.cache.get(normalizedUrl);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(normalizedUrl);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached repository summary
   */
  set(repoUrl: string, data: GitHubSummarizerResponse, ttl?: number): void {
    const normalizedUrl = this.normalizeUrl(repoUrl);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };

    this.cache.set(normalizedUrl, entry);
  }

  /**
   * Check if repository is cached and not expired
   */
  has(repoUrl: string): boolean {
    const normalizedUrl = this.normalizeUrl(repoUrl);
    const entry = this.cache.get(normalizedUrl);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(normalizedUrl);
      return false;
    }

    return true;
  }

  /**
   * Clear cache for a specific repository
   */
  delete(repoUrl: string): void {
    const normalizedUrl = this.normalizeUrl(repoUrl);
    this.cache.delete(normalizedUrl);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: Array<{ url: string; age: number; expiresIn: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([url, entry]) => ({
      url,
      age: now - entry.timestamp,
      expiresIn: entry.ttl - (now - entry.timestamp),
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(url);
      }
    }
  }

  /**
   * Normalize URL for consistent caching
   */
  private normalizeUrl(url: string): string {
    let normalized = url.trim().toLowerCase();
    
    // Remove trailing slash
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    // Remove .git extension
    if (normalized.endsWith('.git')) {
      normalized = normalized.slice(0, -4);
    }
    
    return normalized;
  }
}

