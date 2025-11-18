"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GitHubSummarizerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubSummarizerService = void 0;
const common_1 = require("@nestjs/common");
const api_keys_service_1 = require("../api-keys/api-keys.service");
const github_summarizer_response_schema_1 = require("./schemas/github-summarizer-response.schema");
const github_cache_service_1 = require("./github-cache.service");
let GitHubSummarizerService = GitHubSummarizerService_1 = class GitHubSummarizerService {
    constructor(apiKeysService, cacheService) {
        this.apiKeysService = apiKeysService;
        this.cacheService = cacheService;
        this.logger = new common_1.Logger(GitHubSummarizerService_1.name);
        this.githubToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
        this.openAIApiKey = process.env.OPENAI_API_KEY;
    }
    async processRequest(apiKey, gitHubUrl) {
        const originalApiKey = apiKey.trim();
        const key = await this.apiKeysService.getApiKeyByKey(originalApiKey);
        if (!key) {
            throw new common_1.HttpException({ error: 'Invalid API key' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        let freshKey = key;
        if (key.userId) {
            const fetchedKey = await this.apiKeysService.getApiKeyById(key.id, key.userId);
            if (fetchedKey) {
                freshKey = fetchedKey;
            }
            else {
                this.logger.warn(`Could not fetch fresh key data for key ${key.id}, using cached key`);
            }
        }
        if (freshKey.key !== originalApiKey) {
            this.logger.error(`API key validation error: key mismatch for key ${freshKey.id}`);
            throw new common_1.HttpException({ error: 'API key validation error' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        if (freshKey.remainingUses <= 0) {
            throw new common_1.HttpException({
                error: 'API key usage limit exceeded',
                remainingUses: freshKey.remainingUses || 0,
                usageCount: freshKey.usageCount,
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (!gitHubUrl || typeof gitHubUrl !== 'string' || gitHubUrl.trim().length === 0) {
            throw new common_1.HttpException({ error: 'gitHubUrl is required in the request body' }, common_1.HttpStatus.BAD_REQUEST);
        }
        if (!GitHubSummarizerService_1.GITHUB_URL_PATTERN.test(gitHubUrl.trim())) {
            throw new common_1.HttpException({ error: 'Invalid GitHub URL format. Expected format: https://github.com/owner/repo' }, common_1.HttpStatus.BAD_REQUEST);
        }
        let normalizedUrl = gitHubUrl.trim();
        if (normalizedUrl.endsWith('/')) {
            normalizedUrl = normalizedUrl.slice(0, -1);
        }
        if (normalizedUrl.endsWith('.git')) {
            normalizedUrl = normalizedUrl.slice(0, -4);
        }
        const cachedResult = this.cacheService.get(normalizedUrl);
        if (cachedResult) {
            this.logger.log(`Returning cached result for ${normalizedUrl}`);
            return cachedResult;
        }
        let usageConsumed = false;
        const keyIdForUsage = freshKey.id;
        let owner = null;
        let repo = null;
        try {
            const hasRemainingUses = await this.apiKeysService.checkAndConsumeUsage(keyIdForUsage);
            if (!hasRemainingUses) {
                throw new common_1.HttpException({
                    error: 'API key usage limit exceeded',
                    remainingUses: freshKey.remainingUses || 0,
                    usageCount: freshKey.usageCount,
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            usageConsumed = true;
            const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');
            const urlMatch = normalizedUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
            if (!urlMatch) {
                throw new common_1.HttpException({ error: 'Invalid GitHub URL format' }, common_1.HttpStatus.BAD_REQUEST);
            }
            [, owner, repo] = urlMatch;
            let readmeContent = null;
            let lastError = null;
            let rateLimitReset;
            let rateLimitRemaining;
            for (const branch of GitHubSummarizerService_1.COMMON_BRANCHES) {
                try {
                    const headers = {
                        Accept: 'application/vnd.github.v3.raw',
                        'User-Agent': 'GitHub-Summarizer',
                    };
                    if (this.githubToken) {
                        headers.Authorization = `Bearer ${this.githubToken}`;
                    }
                    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/README.md?ref=${branch}`, { headers });
                    const resetHeader = response.headers.get('x-ratelimit-reset');
                    const remainingHeader = response.headers.get('x-ratelimit-remaining');
                    if (resetHeader)
                        rateLimitReset = parseInt(resetHeader, 10);
                    if (remainingHeader)
                        rateLimitRemaining = parseInt(remainingHeader, 10);
                    if (response.ok) {
                        readmeContent = await response.text();
                        break;
                    }
                    else if (response.status === 404) {
                        continue;
                    }
                    else if (response.status === 429) {
                        const errorMsg = 'GitHub API rate limit exceeded';
                        lastError = new Error(errorMsg);
                        break;
                    }
                    else if (response.status === 403) {
                        const errorText = await response.text().catch(() => '');
                        if (errorText.includes('rate limit') || errorText.includes('API rate limit')) {
                            const errorMsg = 'GitHub API rate limit exceeded';
                            lastError = new Error(errorMsg);
                            break;
                        }
                        continue;
                    }
                    else {
                        this.logger.warn(`Error fetching README from ${branch} branch for ${owner}/${repo}: ${response.status}`);
                        continue;
                    }
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    if (lastError.message.includes('rate limit') || lastError.message.includes('429')) {
                        break;
                    }
                    if (!lastError.message.includes('404') && !lastError.message.includes('fetch')) {
                        break;
                    }
                }
            }
            let docs = [];
            if (!readmeContent) {
                for (const branch of GitHubSummarizerService_1.COMMON_BRANCHES) {
                    try {
                        const loaderOptions = {
                            branch: branch,
                            recursive: false,
                            unknown: "ignore",
                            fileGlob: ["README.md"],
                        };
                        if (this.githubToken) {
                            loaderOptions.accessToken = this.githubToken;
                        }
                        const loader = new GithubRepoLoader(normalizedUrl, loaderOptions);
                        docs = await loader.load();
                        if (docs && docs.length > 0) {
                            break;
                        }
                    }
                    catch (error) {
                        if (!lastError) {
                            lastError = error instanceof Error ? error : new Error(String(error));
                        }
                        continue;
                    }
                }
            }
            let readmeDocs = [];
            if (readmeContent) {
                readmeDocs = [{
                        pageContent: readmeContent,
                        metadata: { source: 'README.md' },
                    }];
            }
            else if (docs && docs.length > 0) {
                readmeDocs = docs.filter((doc) => {
                    const source = doc.metadata?.source || '';
                    const fileName = source.split('/').pop() || '';
                    return /^README\.md$/i.test(fileName);
                });
            }
            if (readmeDocs.length === 0) {
                if (lastError) {
                    let errorMessage = 'Failed to load repository from GitHub';
                    let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
                    const errorResponse = { error: errorMessage };
                    if (lastError instanceof Error) {
                        const errorMsg = lastError.message.toLowerCase();
                        if (errorMsg.includes('rate limit') ||
                            errorMsg.includes('429') ||
                            errorMsg.includes('too many requests') ||
                            errorMsg.includes('api rate limit')) {
                            statusCode = common_1.HttpStatus.TOO_MANY_REQUESTS;
                            errorMessage = 'GitHub API rate limit exceeded';
                            if (rateLimitReset) {
                                errorResponse.rateLimitReset = new Date(rateLimitReset * 1000).toISOString();
                                const waitTime = Math.max(0, rateLimitReset - Math.floor(Date.now() / 1000));
                                errorResponse.waitTimeSeconds = waitTime;
                            }
                            if (rateLimitRemaining !== undefined) {
                                errorResponse.rateLimitRemaining = rateLimitRemaining;
                            }
                        }
                        else if (errorMsg.includes('404') ||
                            errorMsg.includes('not found') ||
                            errorMsg.includes('no commit found')) {
                            statusCode = common_1.HttpStatus.NOT_FOUND;
                            errorMessage = 'Repository not found or branch does not exist';
                        }
                        else if (errorMsg.includes('403') ||
                            errorMsg.includes('forbidden')) {
                            if (errorMsg.includes('rate limit') || errorMsg.includes('api rate limit')) {
                                statusCode = common_1.HttpStatus.TOO_MANY_REQUESTS;
                                errorMessage = 'GitHub API rate limit exceeded';
                                if (rateLimitReset) {
                                    errorResponse.rateLimitReset = new Date(rateLimitReset * 1000).toISOString();
                                    const waitTime = Math.max(0, rateLimitReset - Math.floor(Date.now() / 1000));
                                    errorResponse.waitTimeSeconds = waitTime;
                                }
                                if (rateLimitRemaining !== undefined) {
                                    errorResponse.rateLimitRemaining = rateLimitRemaining;
                                }
                            }
                            else {
                                statusCode = common_1.HttpStatus.FORBIDDEN;
                                errorMessage = 'Access to repository is forbidden';
                            }
                        }
                        else if (errorMsg.includes('401') ||
                            errorMsg.includes('unauthorized')) {
                            statusCode = common_1.HttpStatus.UNAUTHORIZED;
                            errorMessage = 'Unauthorized access to GitHub API';
                        }
                        else if (errorMsg.includes('fetch failed') ||
                            errorMsg.includes('network') ||
                            errorMsg.includes('timeout')) {
                            statusCode = common_1.HttpStatus.SERVICE_UNAVAILABLE;
                            errorMessage = 'Failed to connect to GitHub API';
                        }
                        else {
                            errorMessage = `Failed to load repository: ${lastError.message}`;
                        }
                    }
                    errorResponse.error = errorMessage;
                    throw new common_1.HttpException(errorResponse, statusCode);
                }
                const noReadmeResponse = {
                    summary: "No README.md file found in this repository.",
                    coolFacts: ["This repository does not contain a README file."],
                    filesAnalyzed: 0,
                    repo: gitHubUrl,
                };
                const validated = github_summarizer_response_schema_1.GitHubSummarizerResponseSchema.parse(noReadmeResponse);
                this.cacheService.set(normalizedUrl, validated);
                await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
                return validated;
            }
            const finalReadmeContent = readmeContent || readmeDocs
                .map((doc) => doc.pageContent)
                .filter((content) => content && content.trim().length > 0)
                .join("\n\n---\n\n");
            if (finalReadmeContent.includes('See https://help.github.com/articles/ignoring-files/')) {
                const errorResponse = {
                    summary: "Unable to extract summary from README. The file may be empty or in an unexpected format.",
                    coolFacts: ["The repository may not contain a valid README file."],
                    filesAnalyzed: readmeDocs.length,
                    repo: gitHubUrl,
                    readmeLength: finalReadmeContent.length,
                };
                const validated = github_summarizer_response_schema_1.GitHubSummarizerResponseSchema.parse(errorResponse);
                this.cacheService.set(normalizedUrl, validated);
                await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
                return validated;
            }
            let extractedInfo = null;
            if (this.openAIApiKey) {
                try {
                    const { ChatOpenAI } = require('@langchain/openai');
                    const model = new ChatOpenAI({
                        model: 'gpt-4o-mini',
                        temperature: 0.3,
                        apiKey: this.openAIApiKey,
                    });
                    const outputSchema = github_summarizer_response_schema_1.GitHubSummarizerResponseSchema.pick({
                        summary: true,
                        coolFacts: true,
                    });
                    const structuredModel = model.withStructuredOutput(outputSchema, {
                        name: 'GitHubSummarizerResponse',
                    });
                    const limitedContent = finalReadmeContent.substring(0, GitHubSummarizerService_1.README_CONTENT_LIMIT);
                    const prompt = `Extract from this README:
1. Summary (max ${GitHubSummarizerService_1.SUMMARY_MAX_LENGTH} chars): What is this project?
2. 3-5 cool facts: Key features, tech stack, notable aspects

Rules: Plain text only, no HTML/Markdown/badges/images/links.

README:
${limitedContent}${finalReadmeContent.length > GitHubSummarizerService_1.README_CONTENT_LIMIT ? '...' : ''}`;
                    const result = await structuredModel.invoke(prompt);
                    const cleanSummary = this.cleanText(result.summary || 'A well-documented project with comprehensive information.');
                    const cleanFacts = (result.coolFacts && result.coolFacts.length > 0
                        ? result.coolFacts.slice(0, GitHubSummarizerService_1.MAX_COOL_FACTS).map(fact => this.cleanText(fact))
                        : ['This project has a comprehensive README with detailed documentation.']);
                    extractedInfo = {
                        summary: cleanSummary,
                        coolFacts: cleanFacts,
                    };
                }
                catch (error) {
                    this.logger.error(`Error using LLM for extraction for ${normalizedUrl}:`, error);
                    extractedInfo = this.extractInfoManually(finalReadmeContent);
                }
            }
            else {
                this.logger.warn('OPENAI_API_KEY not set, using manual extraction');
                extractedInfo = this.extractInfoManually(finalReadmeContent);
            }
            if (!extractedInfo) {
                const errorResponse = {
                    summary: "Unable to extract summary from README. The file may be empty or in an unexpected format.",
                    coolFacts: ["The repository may not contain a valid README file."],
                    filesAnalyzed: readmeDocs.length,
                    repo: gitHubUrl,
                    readmeLength: finalReadmeContent.length,
                };
                const validated = github_summarizer_response_schema_1.GitHubSummarizerResponseSchema.parse(errorResponse);
                this.cacheService.set(normalizedUrl, validated);
                await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
                return validated;
            }
            const response = {
                summary: extractedInfo.summary,
                coolFacts: extractedInfo.coolFacts,
                filesAnalyzed: readmeDocs.length,
                repo: gitHubUrl,
                readmeLength: readmeContent.length,
            };
            const validatedResponse = github_summarizer_response_schema_1.GitHubSummarizerResponseSchema.parse(response);
            this.cacheService.set(normalizedUrl, validatedResponse);
            await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
            return validatedResponse;
        }
        catch (error) {
            this.logger.error(`Error summarizing GitHub repository ${gitHubUrl}:`, error);
            if (usageConsumed) {
                try {
                    await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, false);
                }
                catch (recordError) {
                    this.logger.error(`Error recording failed usage for key ${keyIdForUsage}:`, recordError);
                }
            }
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            let errorMessage = 'Failed to summarize GitHub repository';
            let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            if (error instanceof Error) {
                const errorMsg = error.message.toLowerCase();
                if (errorMsg.includes('rate limit') ||
                    errorMsg.includes('429') ||
                    errorMsg.includes('too many requests') ||
                    errorMsg.includes('api rate limit')) {
                    statusCode = common_1.HttpStatus.TOO_MANY_REQUESTS;
                    errorMessage = 'GitHub API rate limit exceeded';
                }
                else if (errorMsg.includes('404') ||
                    errorMsg.includes('not found') ||
                    errorMsg.includes('no commit found')) {
                    statusCode = common_1.HttpStatus.NOT_FOUND;
                    errorMessage = 'Repository not found or branch does not exist';
                }
                else if (errorMsg.includes('403') ||
                    errorMsg.includes('forbidden')) {
                    if (errorMsg.includes('rate limit') || errorMsg.includes('api rate limit')) {
                        statusCode = common_1.HttpStatus.TOO_MANY_REQUESTS;
                        errorMessage = 'GitHub API rate limit exceeded';
                    }
                    else {
                        statusCode = common_1.HttpStatus.FORBIDDEN;
                        errorMessage = 'Access to repository is forbidden';
                    }
                }
                else if (errorMsg.includes('401') ||
                    errorMsg.includes('unauthorized')) {
                    statusCode = common_1.HttpStatus.UNAUTHORIZED;
                    errorMessage = 'Unauthorized access to GitHub API';
                }
                else if (errorMsg.includes('fetch failed') ||
                    errorMsg.includes('network') ||
                    errorMsg.includes('timeout')) {
                    statusCode = common_1.HttpStatus.SERVICE_UNAVAILABLE;
                    errorMessage = 'Failed to connect to GitHub API';
                }
                else {
                    errorMessage = `Failed to summarize GitHub repository: ${error.message}`;
                }
            }
            throw new common_1.HttpException({ error: errorMessage }, statusCode);
        }
    }
    cleanText(text) {
        if (!text)
            return text;
        let cleaned = text.replace(/<[^>]*>/g, '');
        cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1');
        cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        cleaned = cleaned.replace(/!\[.*?\]\(https?:\/\/[^\)]+\)/g, '');
        cleaned = cleaned.replace(/^#+\s+/gm, '');
        cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
        cleaned = cleaned.replace(/`[^`]+`/g, '');
        cleaned = cleaned.replace(/\*\*([^\*]+)\*\*/g, '$1');
        cleaned = cleaned.replace(/\*([^\*]+)\*/g, '$1');
        cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
        cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
        cleaned = cleaned.replace(/^[\*\-\+]\s+/gm, '');
        cleaned = cleaned.replace(/^\d+\.\s+/gm, '');
        cleaned = cleaned.replace(/\|.*?\|/g, '');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        cleaned = cleaned.replace(/[^\w\s\.\,\!\?\:\;\-\(\)]/g, ' ');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }
    extractInfoManually(text) {
        if (text.includes('See https://help.github.com/articles/ignoring-files/')) {
            return null;
        }
        const lines = text.split('\n');
        const sections = {
            title: [],
            description: [],
            features: [],
            installation: [],
            usage: [],
            technologies: [],
            facts: [],
        };
        let currentSection = 'description';
        let foundFirstHeader = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!foundFirstHeader && line.length === 0) {
                continue;
            }
            if (line.startsWith('# ') && !foundFirstHeader) {
                const title = line.replace(/^#+\s*/, '').trim();
                if (title.length > 0) {
                    sections.title.push(title);
                    foundFirstHeader = true;
                    currentSection = 'description';
                }
                continue;
            }
            if (line.match(/^##+\s+/)) {
                const headerText = line.replace(/^#+\s*/, '').trim().toLowerCase();
                if (headerText.match(/(features?|what|about|overview)/)) {
                    currentSection = 'features';
                }
                else if (headerText.match(/(install|setup|getting started|quick start)/)) {
                    currentSection = 'installation';
                }
                else if (headerText.match(/(usage|how to use|example|examples|demo)/)) {
                    currentSection = 'usage';
                }
                else if (headerText.match(/(tech|stack|built with|technologies?|tools|dependencies)/)) {
                    currentSection = 'technologies';
                }
                else if (headerText.match(/(description|about|overview|introduction)/)) {
                    currentSection = 'description';
                }
                else if (headerText.match(/(facts?|interesting|highlights?|notable|fun facts?)/)) {
                    currentSection = 'facts';
                }
                continue;
            }
            if (line.length > 0 &&
                !line.startsWith('#') &&
                !line.startsWith('```') &&
                !line.startsWith('|') &&
                !line.match(/^\[.*\]\(.*\)$/) &&
                line.length < 200) {
                if (sections[currentSection].length < 20) {
                    sections[currentSection].push(line);
                }
            }
        }
        const summaryParts = [];
        if (sections.title.length > 0) {
            summaryParts.push(sections.title[0]);
        }
        if (sections.description.length > 0) {
            const desc = sections.description.slice(0, 10).join(' ').trim();
            if (desc.length > 0) {
                summaryParts.push(desc);
            }
        }
        if (summaryParts.length === 0) {
            const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/\[.*?\]\(.*?\)/g, '').trim();
            const firstParagraph = cleanText.split('\n\n')[0] || cleanText.substring(0, 500);
            summaryParts.push(firstParagraph);
        }
        const summary = summaryParts.join('. ').substring(0, 500).trim();
        const coolFacts = [];
        if (sections.features.length > 0) {
            sections.features.slice(0, 3).forEach((feature) => {
                if (feature.length > 20 && feature.length < 150) {
                    coolFacts.push(feature);
                }
            });
        }
        if (sections.technologies.length > 0) {
            const techList = sections.technologies.slice(0, 5).join(', ');
            if (techList.length > 0) {
                coolFacts.push(`Built with: ${techList}`);
            }
        }
        if (sections.facts.length > 0) {
            sections.facts.slice(0, 5).forEach((fact) => {
                if (fact.length > 20 && fact.length < 200) {
                    coolFacts.push(fact);
                }
            });
        }
        if (coolFacts.length < 3 && sections.description.length > 0) {
            sections.description.slice(5, 10).forEach((line) => {
                if (line.length > 30 && line.length < 150 && !coolFacts.includes(line)) {
                    coolFacts.push(line);
                }
            });
        }
        if (coolFacts.length === 0) {
            coolFacts.push('This project has a comprehensive README with detailed documentation.');
        }
        return {
            summary: summary || 'A well-documented project with comprehensive information.',
            coolFacts: coolFacts.slice(0, 5),
        };
    }
};
exports.GitHubSummarizerService = GitHubSummarizerService;
GitHubSummarizerService.COMMON_BRANCHES = ['main', 'master', 'develop', 'dev', 'trunk'];
GitHubSummarizerService.README_CONTENT_LIMIT = 4000;
GitHubSummarizerService.SUMMARY_MAX_LENGTH = 300;
GitHubSummarizerService.MAX_COOL_FACTS = 5;
GitHubSummarizerService.GITHUB_URL_PATTERN = /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+/i;
exports.GitHubSummarizerService = GitHubSummarizerService = GitHubSummarizerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [api_keys_service_1.ApiKeysService,
        github_cache_service_1.GitHubCacheService])
], GitHubSummarizerService);
//# sourceMappingURL=github-summarizer.service.js.map