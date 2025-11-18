import { ApiKeysService } from '../api-keys/api-keys.service';
export declare class GitHubSummarizerService {
    private readonly apiKeysService;
    constructor(apiKeysService: ApiKeysService);
    processRequest(apiKey: string, gitHubUrl: string): Promise<{
        summary: string;
        coolFacts: string[];
        filesAnalyzed: number;
        repo: string;
        readmeLength?: number;
    }>;
}
