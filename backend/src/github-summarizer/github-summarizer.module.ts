import { Module } from '@nestjs/common';
import { GitHubSummarizerController } from './github-summarizer.controller';
import { GitHubSummarizerService } from './github-summarizer.service';
import { GitHubRateLimitService } from './github-rate-limit.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [ApiKeysModule],
  controllers: [GitHubSummarizerController],
  providers: [GitHubSummarizerService, GitHubRateLimitService],
})
export class GitHubSummarizerModule {}

