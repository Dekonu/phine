import { GitHubSummarizerService } from './github-summarizer.service';
import { GitHubSummarizerDto } from './dto/github-summarizer.dto';
export declare class GitHubSummarizerController {
    private readonly githubSummarizerService;
    constructor(githubSummarizerService: GitHubSummarizerService);
    summarize(dto: GitHubSummarizerDto, headers: Record<string, string>): Promise<{
        summary: string;
        coolFacts: string[];
        filesAnalyzed: number;
        repo: string;
        readmeLength?: number;
    }>;
}
