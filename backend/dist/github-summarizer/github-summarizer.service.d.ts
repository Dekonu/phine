import { ApiKeysService } from '../api-keys/api-keys.service';
import { GitHubCacheService } from './github-cache.service';
export declare class GitHubSummarizerService {
    private readonly apiKeysService;
    private readonly cacheService;
    private readonly githubToken;
    private readonly openAIApiKey;
    constructor(apiKeysService: ApiKeysService, cacheService: GitHubCacheService);
    processRequest(apiKey: string, gitHubUrl: string): Promise<{
        summary: string;
        coolFacts: string[];
        filesAnalyzed: number;
        repo: string;
        readmeLength?: number;
    }>;
    private cleanText;
    private extractInfoManually;
}
