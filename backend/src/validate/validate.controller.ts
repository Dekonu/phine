import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ValidateService } from './validate.service';
import { ValidateDto } from './dto/validate.dto';

/**
 * Controller for API key validation.
 * Provides endpoint to validate whether an API key exists and is valid.
 */
@Controller('validate')
export class ValidateController {
  private readonly logger = new Logger(ValidateController.name);

  constructor(private readonly validateService: ValidateService) {}

  /**
   * Validates an API key.
   *
   * @param dto - DTO containing the API key to validate
   * @returns Object indicating whether the API key is valid
   * @throws HttpException if API key is missing or invalid format
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async validate(@Body() dto: ValidateDto) {
    if (!dto.apiKey || typeof dto.apiKey !== 'string' || dto.apiKey.trim().length === 0) {
      this.logger.warn('API key validation request rejected: missing or invalid API key format');
      throw new HttpException(
        { error: 'API key is required', valid: false },
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.debug('Validating API key');
    return this.validateService.validateApiKey(dto.apiKey.trim());
  }
}

