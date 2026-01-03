import { Injectable, Logger } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';

/**
 * Service for validating API keys.
 * Provides functionality to check if an API key is valid and exists in the system.
 */
@Injectable()
export class ValidateService {
  private readonly logger = new Logger(ValidateService.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  /**
   * Validates an API key by checking if it exists in the database.
   *
   * @param apiKey - The API key to validate
   * @returns An object indicating whether the key is valid, or an error object if validation fails
   */
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const key = await this.apiKeysService.getApiKeyByKey(apiKey);

      if (!key) {
        this.logger.debug(`API key validation failed: key not found`);
        return { valid: false };
      }

      this.logger.debug(`API key validated successfully: ${key.id}`);
      return { valid: true };
    } catch (error) {
      this.logger.error('Error validating API key', error instanceof Error ? error.stack : error);
      return { error: 'Failed to validate API key', valid: false };
    }
  }
}

