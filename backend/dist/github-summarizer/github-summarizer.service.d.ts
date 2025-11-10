import { ApiKeysService } from '../api-keys/api-keys.service';
import { GitHubRateLimitService } from './github-rate-limit.service';
export declare class GitHubSummarizerService {
    private readonly apiKeysService;
    private readonly rateLimitService;
    constructor(apiKeysService: ApiKeysService, rateLimitService: GitHubRateLimitService);
    processRequest(apiKey: string, gitHubUrl: string): Promise<{
        summary: string;
        filesAnalyzed: number;
        repo: string;
        readmeLength?: undefined;
    } | {
        summary: string;
        filesAnalyzed: any;
        repo: string;
        readmeLength: any;
    }>;
    private sleep;
}
