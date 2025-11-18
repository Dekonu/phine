import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ApiKey } from './interfaces/api-key.interface';
import { ApiKeyDbRow } from './interfaces/db-row.interface';

/**
 * Service for managing API keys
 */
@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);
  private static readonly DEFAULT_USAGE_COUNT = 1000;
  private static readonly API_KEY_PREFIX = 'sk_live_';
  private static readonly API_KEY_BYTES = 32;
  private static readonly MASK_PREFIX_LENGTH = 8;
  private static readonly MASK_SUFFIX_LENGTH = 4;

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Generates a cryptographically secure API key
   * @returns A new API key with format: sk_live_<64-char-hex>
   */
  private generateSecureApiKey(): string {
    const randomBytes = new Uint8Array(ApiKeysService.API_KEY_BYTES);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      throw new Error('Cryptographic API not available');
    }

    const hexString = Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    return `${ApiKeysService.API_KEY_PREFIX}${hexString}`;
  }

  /**
   * Masks an API key for display purposes
   * Shows first 8 and last 4 characters, masks the rest
   * @param key - The API key to mask
   * @returns Masked API key string
   */
  private maskApiKey(key: string): string {
    const minLength = ApiKeysService.MASK_PREFIX_LENGTH + ApiKeysService.MASK_SUFFIX_LENGTH;
    if (key.length <= minLength) return '•'.repeat(key.length);
    
    const prefix = key.substring(0, ApiKeysService.MASK_PREFIX_LENGTH);
    const suffix = key.substring(key.length - ApiKeysService.MASK_SUFFIX_LENGTH);
    const masked = '•'.repeat(key.length - minLength);
    return `${prefix}${masked}${suffix}`;
  }

  /**
   * Converts a database row to an ApiKey interface
   * @param row - Database row from Supabase
   * @returns ApiKey object
   */
  private dbRowToApiKey(row: ApiKeyDbRow): ApiKey {
    return {
      id: row.id,
      name: row.name,
      key: row.key,
      createdAt: row.created_at || row.created_at_iso || new Date(row.created_at).toISOString(),
      lastUsed: row.last_used ? new Date(row.last_used).toISOString() : undefined,
      usageCount: row.usage_count || ApiKeysService.DEFAULT_USAGE_COUNT,
      remainingUses:
        row.remaining_uses !== undefined 
          ? row.remaining_uses 
          : row.usage_count || ApiKeysService.DEFAULT_USAGE_COUNT,
      userId: row.user_id,
    };
  }

  /**
   * Gets the actual usage count for an API key from the api_usage table
   * @param keyId - The API key ID
   * @returns The number of times the key has been used
   */
  private async getActualUsageCount(keyId: string): Promise<number> {
    try {
      const { count, error } = await this.supabaseService
        .getClient()
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('key_id', keyId);

      if (error) {
        this.logger.error(`Error getting usage count for key ${keyId}:`, error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      this.logger.error(`Failed to get actual usage count for key ${keyId}:`, error);
      return 0;
    }
  }

  /**
   * Retrieves all API keys for a specific user
   * @param userId - The user ID to filter by
   * @returns Array of API keys (with masked keys)
   */
  async getAllApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error(`Error fetching API keys for user ${userId}:`, error);
        throw error;
      }

      const keysWithUsage = await Promise.all(
        (data || []).map(async (row) => {
          const apiKey = this.dbRowToApiKey(row);
          const actualUsage = await this.getActualUsageCount(apiKey.id);
          
          const remainingUses = row.remaining_uses !== undefined 
            ? row.remaining_uses 
            : apiKey.usageCount;
          
          return {
            ...apiKey,
            key: this.maskApiKey(apiKey.key),
            remainingUses,
            actualUsage,
          };
        }),
      );

      return keysWithUsage;
    } catch (error) {
      this.logger.error(`Failed to get all API keys for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Retrieves a specific API key by ID (ensures it belongs to the user)
   * @param id - The API key ID
   * @param userId - The user ID to verify ownership
   * @returns The API key or undefined if not found
   */
  async getApiKeyById(id: string, userId: string): Promise<ApiKey | undefined> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('api_keys')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        this.logger.error(`Error fetching API key ${id} for user ${userId}:`, error);
        throw error;
      }

      if (!data) return undefined;

      const apiKey = this.dbRowToApiKey(data);
      const actualUsage = await this.getActualUsageCount(apiKey.id);
      
      return {
        ...apiKey,
        actualUsage,
      };
    } catch (error) {
      this.logger.error(`Failed to get API key ${id} for user ${userId}:`, error);
      return undefined;
    }
  }

  /**
   * Retrieves an API key by its key string (for validation purposes)
   * @param keyString - The API key string to look up
   * @returns The API key or undefined if not found
   */
  async getApiKeyByKey(keyString: string): Promise<ApiKey | undefined> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('api_keys')
        .select('*')
        .eq('key', keyString)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined;
        }
        this.logger.error('Error fetching API key by key string:', error);
        throw error;
      }

      if (!data) return undefined;

      return this.dbRowToApiKey(data);
    } catch (error) {
      this.logger.error('Failed to get API key by key string:', error);
      return undefined;
    }
  }

  /**
   * Creates a new API key for a user
   * @param name - The name/label for the API key
   * @param userId - The user ID who owns this key
   * @returns The newly created API key
   * @throws Error if creation fails
   */
  async createApiKey(name: string, userId: string): Promise<ApiKey> {
    try {
      const generatedKey = this.generateSecureApiKey();
      const now = new Date().toISOString();

      const { data, error } = await this.supabaseService
        .getClient()
        .from('api_keys')
        .insert({
          name,
          key: generatedKey,
          user_id: userId,
          created_at: now,
          usage_count: ApiKeysService.DEFAULT_USAGE_COUNT,
          remaining_uses: ApiKeysService.DEFAULT_USAGE_COUNT,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Error creating API key for user ${userId}:`, error);
        throw error;
      }

      if (!data) {
        throw new Error('Failed to create API key: no data returned');
      }

      this.logger.log(`API key created successfully for user ${userId}: ${data.id}`);
      return this.dbRowToApiKey(data);
    } catch (error) {
      this.logger.error(`Failed to create API key for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Updates an API key's name
   * @param id - The API key ID
   * @param name - The new name for the key
   * @param userId - The user ID to verify ownership
   * @returns The updated API key or null if not found
   */
  async updateApiKey(id: string, name: string, userId: string): Promise<ApiKey | null> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('api_keys')
        .update({ name })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        this.logger.error(`Error updating API key ${id} for user ${userId}:`, error);
        throw error;
      }

      if (!data) return null;

      this.logger.log(`API key ${id} updated successfully for user ${userId}`);
      return this.dbRowToApiKey(data);
    } catch (error) {
      this.logger.error(`Failed to update API key ${id} for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Deletes an API key and all its usage records
   * @param id - The API key ID
   * @param userId - The user ID to verify ownership
   * @returns true if deleted successfully, false otherwise
   */
  async deleteApiKey(id: string, userId: string): Promise<boolean> {
    try {
      // Delete all usage records first (cascade should handle this, but being explicit)
      await this.supabaseService
        .getClient()
        .from('api_usage')
        .delete()
        .eq('key_id', id);

      const { error } = await this.supabaseService
        .getClient()
        .from('api_keys')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        if (error.code === 'PGRST116') {
          return false;
        }
        this.logger.error(`Error deleting API key ${id} for user ${userId}:`, error);
        throw error;
      }

      this.logger.log(`API key ${id} deleted successfully for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete API key ${id} for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Checks if an API key has remaining uses and atomically consumes one
   * Uses database-level constraints to prevent race conditions
   * @param keyId - The API key ID
   * @returns true if usage was consumed, false if no remaining uses
   */
  async checkAndConsumeUsage(keyId: string): Promise<boolean> {
    try {
      const { data, error: fetchError } = await this.supabaseService
        .getClient()
        .from('api_keys')
        .select('remaining_uses')
        .eq('id', keyId)
        .single();

      if (fetchError || !data) {
        this.logger.error(`Error fetching API key ${keyId} for usage check:`, fetchError);
        return false;
      }

      const currentRemaining = data.remaining_uses || 0;

      if (currentRemaining <= 0) {
        this.logger.warn(`API key ${keyId} has no remaining uses`);
        return false;
      }

      // Perform atomic update with WHERE clause to prevent race conditions
      const { data: updateData, error: updateError } = await this.supabaseService
        .getClient()
        .from('api_keys')
        .update({
          remaining_uses: currentRemaining - 1,
          last_used: new Date().toISOString(),
        })
        .eq('id', keyId)
        .gt('remaining_uses', 0)
        .select('id')
        .single();

      if (!updateData || updateError) {
        if (updateError) {
          this.logger.error(`Error updating remaining uses for key ${keyId}:`, updateError);
        }
        return false;
      }

      // Verify the key ID matches what we intended to update
      if (updateData.id !== keyId) {
        this.logger.error(`Critical error: Updated wrong key ID. Expected ${keyId}, got ${updateData.id}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to check and consume usage for key ${keyId}:`, error);
      return false;
    }
  }

  /**
   * Records API usage for analytics
   * @param keyId - The API key ID
   * @param responseTime - Optional response time in milliseconds
   * @param success - Whether the request was successful
   */
  async recordApiUsage(
    keyId: string,
    responseTime?: number,
    success: boolean = true,
  ): Promise<void> {
    try {
      const { error: usageError } = await this.supabaseService
        .getClient()
        .from('api_usage')
        .insert({
          key_id: keyId,
          timestamp: new Date().toISOString(),
          response_time: responseTime,
          success,
        });

      if (usageError) {
        this.logger.error(`Error recording API usage for key ${keyId}:`, usageError);
        return;
      }
    } catch (error) {
      this.logger.error(`Failed to record API usage for key ${keyId}:`, error);
    }
  }
}

