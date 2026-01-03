import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { GitHubSummarizerService } from './github-summarizer.service';
import { GitHubSummarizerDto } from './dto/github-summarizer.dto';

/**
 * Controller for GitHub repository summarization.
 * Generates AI-powered summaries and cool facts from GitHub repository README files.
 */
@Controller('github-summarizer')
export class GitHubSummarizerController {
  private readonly logger = new Logger(GitHubSummarizerController.name);

  constructor(private readonly githubSummarizerService: GitHubSummarizerService) {}

  /**
   * Generates a summary and cool facts for a GitHub repository.
   * Requires an API key in the X-API-Key header or Authorization header.
   *
   * @param dto - DTO containing the GitHub repository URL
   * @param headers - Request headers containing the API key
   * @returns Summary and cool facts about the repository
   * @throws HttpException if API key is missing or invalid, or if summarization fails
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async summarize(@Body() dto: GitHubSummarizerDto, @Headers() headers: Record<string, string>) {
    // Extract API key from various header formats
    const apiKey =
      headers['x-api-key'] ||
      headers['authorization']?.replace('Bearer ', '') ||
      headers['authorization']?.replace('ApiKey ', '');

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      this.logger.warn('GitHub summarizer request rejected: missing API key');
      throw new HttpException(
        {
          error:
            'API key is required. Please provide it in the X-API-Key header or Authorization header.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      this.logger.debug(`Processing GitHub summarizer request for: ${dto.gitHubUrl}`);
      return await this.githubSummarizerService.processRequest(apiKey.trim(), dto.gitHubUrl);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error processing GitHub summarizer request for: ${dto.gitHubUrl}`,
        error instanceof Error ? error.stack : error,
      );
      throw new HttpException(
        { error: 'Internal server error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

