import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  HttpException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { UserAuthGuard } from '../common/guards/user-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';

/**
 * Controller for managing API keys.
 * Handles CRUD operations for API keys with user authentication and authorization.
 * All endpoints require authentication via UserAuthGuard.
 */
@Controller('api-keys')
@UseGuards(UserAuthGuard)
export class ApiKeysController {
  private readonly logger = new Logger(ApiKeysController.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  /**
   * Retrieves all API keys for the authenticated user.
   *
   * @param userId - The authenticated user's ID (extracted from request)
   * @returns Array of API keys (with masked keys for security)
   */
  @Get()
  async getAllApiKeys(@UserId() userId: string) {
    this.logger.debug(`Fetching all API keys for user: ${userId}`);
    return this.apiKeysService.getAllApiKeys(userId);
  }

  /**
   * Retrieves a specific API key by ID for the authenticated user.
   * Returns the key with masked value for security.
   *
   * @param id - The API key ID
   * @param userId - The authenticated user's ID
   * @returns API key object with masked key value
   * @throws HttpException if API key not found or user doesn't have access
   */
  @Get(':id')
  async getApiKeyById(@Param('id') id: string, @UserId() userId: string) {
    this.logger.debug(`Fetching API key ${id} for user: ${userId}`);
    const apiKey = await this.apiKeysService.getApiKeyById(id, userId);

    if (!apiKey) {
      this.logger.warn(`API key ${id} not found for user: ${userId}`);
      throw new HttpException({ error: 'API key not found' }, HttpStatus.NOT_FOUND);
    }

    // Return masked key for security (first 8 chars + dots + last 4 chars)
    return {
      ...apiKey,
      key:
        apiKey.key.substring(0, 8) +
        '•'.repeat(apiKey.key.length - 12) +
        apiKey.key.substring(apiKey.key.length - 4),
    };
  }

  /**
   * Reveals the full (unmasked) API key value.
   * Use with caution - this endpoint should only be called when the user explicitly needs to see their key.
   *
   * @param id - The API key ID
   * @param userId - The authenticated user's ID
   * @returns API key object with full (unmasked) key value
   * @throws HttpException if API key not found or user doesn't have access
   */
  @Get(':id/reveal')
  async revealApiKey(@Param('id') id: string, @UserId() userId: string) {
    this.logger.debug(`Revealing API key ${id} for user: ${userId}`);
    const apiKey = await this.apiKeysService.getApiKeyById(id, userId);

    if (!apiKey) {
      this.logger.warn(`API key ${id} not found for user: ${userId}`);
      throw new HttpException({ error: 'API key not found' }, HttpStatus.NOT_FOUND);
    }

    // Return full key (unmasked) - user explicitly requested to see it
    return {
      id: apiKey.id,
      key: apiKey.key,
    };
  }

  /**
   * Creates a new API key for the authenticated user.
   *
   * @param createApiKeyDto - DTO containing the API key name
   * @param userId - The authenticated user's ID
   * @returns The newly created API key (with full key value on creation)
   * @throws HttpException if name is invalid or creation fails
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createApiKey(@Body() createApiKeyDto: CreateApiKeyDto, @UserId() userId: string) {
    const { name } = createApiKeyDto;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      this.logger.warn(`Invalid API key name provided by user: ${userId}`);
      throw new HttpException(
        { error: 'Name is required and must be a non-empty string' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      this.logger.debug(`Creating API key "${name.trim()}" for user: ${userId}`);
      const newApiKey = await this.apiKeysService.createApiKey(name.trim(), userId);
      this.logger.log(`API key created successfully: ${newApiKey.id} for user: ${userId}`);
      return newApiKey;
    } catch (error) {
      this.logger.error(
        `Error creating API key for user: ${userId}`,
        error instanceof Error ? error.stack : error,
      );
      throw new HttpException(
        { error: 'Failed to create API key' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Updates an existing API key (currently only the name can be updated).
   *
   * @param id - The API key ID to update
   * @param updateApiKeyDto - DTO containing the new name
   * @param userId - The authenticated user's ID
   * @returns Updated API key object with masked key value
   * @throws HttpException if name is invalid, key not found, or update fails
   */
  @Put(':id')
  async updateApiKey(
    @Param('id') id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
    @UserId() userId: string,
  ) {
    const { name } = updateApiKeyDto;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      this.logger.warn(`Invalid API key name provided for update by user: ${userId}`);
      throw new HttpException(
        { error: 'Name is required and must be a non-empty string' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      this.logger.debug(`Updating API key ${id} for user: ${userId}`);
      const updatedKey = await this.apiKeysService.updateApiKey(id, name.trim(), userId);

      if (!updatedKey) {
        this.logger.warn(`API key ${id} not found for user: ${userId}`);
        throw new HttpException({ error: 'API key not found' }, HttpStatus.NOT_FOUND);
      }

      this.logger.log(`API key ${id} updated successfully for user: ${userId}`);
      // Return masked key for security
      return {
        ...updatedKey,
        key:
          updatedKey.key.substring(0, 8) +
          '•'.repeat(updatedKey.key.length - 12) +
          updatedKey.key.substring(updatedKey.key.length - 4),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error updating API key ${id} for user: ${userId}`,
        error instanceof Error ? error.stack : error,
      );
      throw new HttpException(
        { error: 'Failed to update API key' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Deletes an API key for the authenticated user.
   *
   * @param id - The API key ID to delete
   * @param userId - The authenticated user's ID
   * @returns Success message
   * @throws HttpException if key not found or deletion fails
   */
  @Delete(':id')
  async deleteApiKey(@Param('id') id: string, @UserId() userId: string) {
    try {
      this.logger.debug(`Deleting API key ${id} for user: ${userId}`);
      const deleted = await this.apiKeysService.deleteApiKey(id, userId);

      if (!deleted) {
        this.logger.warn(`API key ${id} not found for deletion by user: ${userId}`);
        throw new HttpException({ error: 'API key not found' }, HttpStatus.NOT_FOUND);
      }

      this.logger.log(`API key ${id} deleted successfully by user: ${userId}`);
      return { message: 'API key deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error deleting API key ${id} for user: ${userId}`,
        error instanceof Error ? error.stack : error,
      );
      throw new HttpException(
        { error: 'Failed to delete API key' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

