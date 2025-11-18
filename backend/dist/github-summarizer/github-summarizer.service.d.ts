import { ApiKeysService } from '../api-keys/api-keys.service';
import { GitHubSummarizerResponse } from './schemas/github-summarizer-response.schema';
import { GitHubCacheService } from './github-cache.service';
export declare class GitHubSummarizerService {
    private readonly apiKeysService;
    private readonly cacheService;
    private readonly logger;
    private readonly githubToken;
    private readonly openAIApiKey;
    private static readonly COMMON_BRANCHES;
    private static readonly README_CONTENT_LIMIT;
    private static readonly SUMMARY_MAX_LENGTH;
    private static readonly MAX_COOL_FACTS;
    private static readonly GITHUB_URL_PATTERN;
    constructor(apiKeysService: ApiKeysService, cacheService: GitHubCacheService);
    processRequest(apiKey: string, gitHubUrl: string): Promise<GitHubSummarizerResponse>;
    private cleanText;
    private extractInfoManually;
}
