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
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { UserAuthGuard } from '../common/guards/user-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';

@Controller('api-keys')
@UseGuards(UserAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async getAllApiKeys(@UserId() userId: string) {
    return this.apiKeysService.getAllApiKeys(userId);
  }

  @Get(':id')
  async getApiKeyById(@Param('id') id: string, @UserId() userId: string) {
    const apiKey = await this.apiKeysService.getApiKeyById(id, userId);

    if (!apiKey) {
      throw new HttpException({ error: 'API key not found' }, HttpStatus.NOT_FOUND);
    }

    // Return masked key for security
    return {
      ...apiKey,
      key:
        apiKey.key.substring(0, 8) +
        '•'.repeat(apiKey.key.length - 12) +
        apiKey.key.substring(apiKey.key.length - 4),
    };
  }

  @Get(':id/reveal')
  async revealApiKey(@Param('id') id: string, @UserId() userId: string) {
    const apiKey = await this.apiKeysService.getApiKeyById(id, userId);

    if (!apiKey) {
      throw new HttpException({ error: 'API key not found' }, HttpStatus.NOT_FOUND);
    }

    // Return full key (unmasked)
    return {
      id: apiKey.id,
      key: apiKey.key,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createApiKey(@Body() createApiKeyDto: CreateApiKeyDto, @UserId() userId: string) {
    const { name } = createApiKeyDto;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new HttpException(
        { error: 'Name is required and must be a non-empty string' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const newApiKey = await this.apiKeysService.createApiKey(name.trim(), userId);
      return newApiKey;
    } catch (error) {
      console.error('Error creating API key:', error);
      throw new HttpException(
        { error: 'Failed to create API key' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateApiKey(
    @Param('id') id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
    @UserId() userId: string,
  ) {
    const { name } = updateApiKeyDto;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new HttpException(
        { error: 'Name is required and must be a non-empty string' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const updatedKey = await this.apiKeysService.updateApiKey(id, name.trim(), userId);

      if (!updatedKey) {
        throw new HttpException({ error: 'API key not found' }, HttpStatus.NOT_FOUND);
      }

      // Return masked key
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
      throw new HttpException(
        { error: 'Failed to update API key' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteApiKey(@Param('id') id: string, @UserId() userId: string) {
    try {
      const deleted = await this.apiKeysService.deleteApiKey(id, userId);

      if (!deleted) {
        throw new HttpException({ error: 'API key not found' }, HttpStatus.NOT_FOUND);
      }

      return { message: 'API key deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { error: 'Failed to delete API key' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

