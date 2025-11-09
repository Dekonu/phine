// Database storage for API keys using Supabase
import { supabaseServer } from './supabase-server';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number; // Maximum number of API calls allowed
}

export interface ApiUsage {
  keyId: string;
  timestamp: string;
  responseTime?: number;
  success: boolean;
}

export interface ApiMetrics {
  totalRequests: number;
  requestsToday: number;
  avgResponseTime: number;
  successRate: number;
  usageData: Array<{ date: string; count: number }>;
}

/**
 * Generates a cryptographically secure API key
 * Format: sk_live_<64 character hex string>
 * Uses crypto.getRandomValues for secure random generation
 */
function generateSecureApiKey(): string {
  // Generate 32 random bytes (256 bits) for security
  const randomBytes = new Uint8Array(32);
  
  // Use crypto.getRandomValues for cryptographically secure random numbers
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for environments without crypto (shouldn't happen in Node.js)
    throw new Error('Cryptographic API not available');
  }
  
  // Convert to hex string
  const hexString = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  // Return with prefix for identification
  return `sk_live_${hexString}`;
}

/**
 * Masks an API key for display purposes
 * Shows first 8 and last 4 characters, masks the rest
 */
function maskApiKey(key: string): string {
  if (key.length <= 12) return "•".repeat(key.length);
  const prefix = key.substring(0, 8);
  const suffix = key.substring(key.length - 4);
  const masked = "•".repeat(key.length - 12);
  return `${prefix}${masked}${suffix}`;
}

/**
 * Converts database row to ApiKey interface
 */
function dbRowToApiKey(row: any): ApiKey {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    createdAt: row.created_at || row.created_at_iso || new Date(row.created_at).toISOString(),
    lastUsed: row.last_used ? new Date(row.last_used).toISOString() : undefined,
    usageCount: row.usage_count || 1000,
  };
}

export async function getAllApiKeys(): Promise<ApiKey[]> {
  try {
    const { data, error } = await supabaseServer
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      throw error;
    }

    // Return keys with masked values for security
    return (data || []).map(row => {
      const apiKey = dbRowToApiKey(row);
      return {
        ...apiKey,
        key: maskApiKey(apiKey.key),
      };
    });
  } catch (error) {
    console.error('Failed to get all API keys:', error);
    return [];
  }
}

export async function getApiKeyById(id: string): Promise<ApiKey | undefined> {
  try {
    const { data, error } = await supabaseServer
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return undefined;
      }
      console.error('Error fetching API key:', error);
      throw error;
    }

    if (!data) return undefined;

    // Return full key (for display after creation or when explicitly requested)
    return dbRowToApiKey(data);
  } catch (error) {
    console.error('Failed to get API key by ID:', error);
    return undefined;
  }
}

export async function getApiKeyByKey(keyString: string): Promise<ApiKey | undefined> {
  try {
    const { data, error } = await supabaseServer
      .from('api_keys')
      .select('*')
      .eq('key', keyString)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return undefined;
      }
      console.error('Error fetching API key by key:', error);
      throw error;
    }

    if (!data) return undefined;

    return dbRowToApiKey(data);
  } catch (error) {
    console.error('Failed to get API key by key:', error);
    return undefined;
  }
}

export async function createApiKey(name: string): Promise<ApiKey> {
  try {
    const generatedKey = generateSecureApiKey();
    const now = new Date().toISOString();

    const { data, error } = await supabaseServer
      .from('api_keys')
      .insert({
        name,
        key: generatedKey,
        created_at: now,
        usage_count: 1000, // Default usage count
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Failed to create API key: no data returned');
    }

    return dbRowToApiKey(data);
  } catch (error) {
    console.error('Failed to create API key:', error);
    throw error;
  }
}

export async function updateApiKey(id: string, name: string): Promise<ApiKey | null> {
  try {
    const { data, error } = await supabaseServer
      .from('api_keys')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Error updating API key:', error);
      throw error;
    }

    if (!data) return null;

    return dbRowToApiKey(data);
  } catch (error) {
    console.error('Failed to update API key:', error);
    return null;
  }
}

export async function deleteApiKey(id: string): Promise<boolean> {
  try {
    // Delete usage data first (cascade should handle this, but being explicit)
    await supabaseServer
      .from('api_usage')
      .delete()
      .eq('key_id', id);

    // Delete the API key
    const { error } = await supabaseServer
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return false;
      }
      console.error('Error deleting API key:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return false;
  }
}

/**
 * Records API usage for analytics
 */
export async function recordApiUsage(
  keyId: string,
  responseTime?: number,
  success: boolean = true
): Promise<void> {
  try {
    // Insert usage record
    const { error: usageError } = await supabaseServer
      .from('api_usage')
      .insert({
        key_id: keyId,
        timestamp: new Date().toISOString(),
        response_time: responseTime,
        success,
      });

    if (usageError) {
      console.error('Error recording API usage:', usageError);
      // Don't throw - usage tracking shouldn't break the API
      return;
    }

    // Update lastUsed on the API key
    await supabaseServer
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyId);
  } catch (error) {
    console.error('Failed to record API usage:', error);
    // Don't throw - usage tracking shouldn't break the API
  }
}

/**
 * Gets API metrics for the dashboard
 */
export async function getApiMetrics(): Promise<ApiMetrics> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all usage data
    const { data: allUsageData, error: allUsageError } = await supabaseServer
      .from('api_usage')
      .select('*');

    if (allUsageError) {
      console.error('Error fetching usage data:', allUsageError);
      throw allUsageError;
    }

    const allUsage = (allUsageData || []).map(row => ({
      keyId: row.key_id,
      timestamp: new Date(row.timestamp).toISOString(),
      responseTime: row.response_time,
      success: row.success,
    }));

    // Filter usage data
    const todayUsage = allUsage.filter(
      usage => new Date(usage.timestamp) >= todayStart
    );
    const last7DaysUsage = allUsage.filter(
      usage => new Date(usage.timestamp) >= sevenDaysAgo
    );

    // Calculate metrics
    const totalRequests = allUsage.length;
    const requestsToday = todayUsage.length;

    const successfulRequests = allUsage.filter(usage => usage.success).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const responseTimes = allUsage
      .filter(usage => usage.responseTime !== undefined)
      .map(usage => usage.responseTime!);
    const avgResponseTime =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

    // Generate usage data for last 7 days
    const usageData: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = last7DaysUsage.filter(usage => {
        const usageDate = new Date(usage.timestamp);
        return usageDate >= dayStart && usageDate < dayEnd;
      }).length;

      usageData.push({ date: dateStr, count });
    }

    return {
      totalRequests,
      requestsToday,
      avgResponseTime,
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
      usageData,
    };
  } catch (error) {
    console.error('Failed to get API metrics:', error);
    // Return empty metrics on error
    return {
      totalRequests: 0,
      requestsToday: 0,
      avgResponseTime: 0,
      successRate: 0,
      usageData: [],
    };
  }
}
