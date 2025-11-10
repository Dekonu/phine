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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubSummarizerService = void 0;
const common_1 = require("@nestjs/common");
const api_keys_service_1 = require("../api-keys/api-keys.service");
const github_rate_limit_service_1 = require("./github-rate-limit.service");
let GitHubSummarizerService = class GitHubSummarizerService {
    constructor(apiKeysService, rateLimitService) {
        this.apiKeysService = apiKeysService;
        this.rateLimitService = rateLimitService;
    }
    async processRequest(apiKey, gitHubUrl) {
        const originalApiKey = apiKey.trim();
        const key = await this.apiKeysService.getApiKeyByKey(originalApiKey);
        if (!key) {
            throw new common_1.HttpException({ error: 'Invalid API key' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        const freshKey = await this.apiKeysService.getApiKeyById(key.id);
        if (!freshKey) {
            throw new common_1.HttpException({ error: 'API key not found' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        if (freshKey.key !== originalApiKey) {
            console.error('[GitHub Summarizer] API key validation error: key mismatch');
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
        const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+/i;
        if (!githubUrlPattern.test(gitHubUrl.trim())) {
            throw new common_1.HttpException({ error: 'Invalid GitHub URL format. Expected format: https://github.com/owner/repo' }, common_1.HttpStatus.BAD_REQUEST);
        }
        let usageConsumed = false;
        const keyIdForUsage = freshKey.id;
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
            const rateLimitCheck = await this.rateLimitService.checkRateLimit();
            if (!rateLimitCheck.canProceed) {
                throw new common_1.HttpException({
                    error: rateLimitCheck.error || 'GitHub API rate limit exceeded',
                    rateLimitReset: rateLimitCheck.status?.reset
                        ? new Date(rateLimitCheck.status.reset * 1000).toISOString()
                        : undefined,
                    waitTime: rateLimitCheck.waitTime,
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            if (rateLimitCheck.error && rateLimitCheck.status) {
                console.warn(`[GitHub Summarizer] Rate limit warning: ${rateLimitCheck.status.remaining} requests remaining. Reset at ${new Date(rateLimitCheck.status.reset * 1000).toISOString()}`);
            }
            const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');
            let normalizedUrl = gitHubUrl.trim();
            if (normalizedUrl.endsWith('/')) {
                normalizedUrl = normalizedUrl.slice(0, -1);
            }
            if (normalizedUrl.endsWith('.git')) {
                normalizedUrl = normalizedUrl.slice(0, -4);
            }
            const loader = new GithubRepoLoader(normalizedUrl, {
                branch: undefined,
                recursive: true,
                unknown: "ignore",
                fileGlob: ["README.md", "readme.md", "README.MD", "readme.MD"],
                ignoreFiles: [
                    "**/node_modules/**",
                    "**/.git/**",
                    "**/dist/**",
                    "**/build/**",
                    "**/.next/**",
                    "**/coverage/**",
                    "**/.github/**",
                ],
            });
            let docs;
            const maxRetries = 3;
            let retryCount = 0;
            let lastError = null;
            while (retryCount <= maxRetries) {
                try {
                    docs = await loader.load();
                    lastError = null;
                    break;
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    if (lastError.message.includes('Failed wrap file content')) {
                        docs = [];
                        break;
                    }
                    const rateLimitInfo = this.rateLimitService.handleRateLimitError(lastError);
                    if (rateLimitInfo.shouldRetry && retryCount < maxRetries) {
                        retryCount++;
                        const waitTime = rateLimitInfo.waitTime * Math.pow(2, retryCount - 1);
                        console.warn(`[GitHub Summarizer] Rate limit error (attempt ${retryCount}/${maxRetries}). Waiting ${waitTime}s before retry...`);
                        await this.sleep(waitTime * 1000);
                        await this.rateLimitService.checkRateLimit();
                        continue;
                    }
                    throw lastError;
                }
            }
            if (lastError && !docs) {
                throw lastError;
            }
            const readmeDocs = docs.filter((doc) => {
                const source = doc.metadata?.source || '';
                const fileName = source.split('/').pop() || '';
                return /^README\.md$/i.test(fileName);
            });
            if (readmeDocs.length === 0) {
                return {
                    summary: "No README.md file found in this repository.",
                    filesAnalyzed: 0,
                    repo: gitHubUrl,
                };
            }
            const readmeContent = readmeDocs
                .map((doc) => doc.pageContent)
                .filter((content) => content && content.trim().length > 0)
                .join("\n\n---\n\n");
            const extractKeyInfo = (text) => {
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
                        continue;
                    }
                    if (line.length > 0 &&
                        !line.startsWith('#') &&
                        !line.startsWith('```') &&
                        !line.startsWith('|') &&
                        !line.match(/^\[.*\]\(.*\)$/) &&
                        line.length < 200) {
                        if (sections[currentSection].length < 15) {
                            sections[currentSection].push(line);
                        }
                    }
                }
                const summaryParts = [];
                if (sections.title.length > 0) {
                    summaryParts.push(`**Project:** ${sections.title[0]}`);
                }
                if (sections.description.length > 0) {
                    const desc = sections.description.slice(0, 8).join(' ');
                    if (desc.length > 0) {
                        summaryParts.push(`\n**Description:**\n${desc}`);
                    }
                }
                if (sections.features.length > 0) {
                    summaryParts.push(`\n**Key Features:**\n${sections.features.slice(0, 8).join('\n')}`);
                }
                if (sections.technologies.length > 0) {
                    summaryParts.push(`\n**Technologies:**\n${sections.technologies.slice(0, 8).join('\n')}`);
                }
                if (summaryParts.length === 0) {
                    const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/\[.*?\]\(.*?\)/g, '').trim();
                    return cleanText.substring(0, 1000) + (cleanText.length > 1000 ? '...' : '');
                }
                return summaryParts.join('\n\n');
            };
            const summary = extractKeyInfo(readmeContent);
            if (!summary) {
                return {
                    summary: "Unable to extract summary from README. The file may be empty or in an unexpected format.",
                    filesAnalyzed: readmeDocs.length,
                    repo: gitHubUrl,
                    readmeLength: readmeContent.length,
                };
            }
            await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
            return {
                summary: summary,
                filesAnalyzed: readmeDocs.length,
                repo: gitHubUrl,
                readmeLength: readmeContent.length,
            };
        }
        catch (error) {
            console.error('Error summarizing GitHub repository:', error);
            if (usageConsumed) {
                try {
                    await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, false);
                }
                catch (recordError) {
                    console.error('Error recording failed usage:', recordError);
                }
            }
            let errorMessage = 'Failed to summarize GitHub repository';
            let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            if (error instanceof Error) {
                const rateLimitInfo = this.rateLimitService.handleRateLimitError(error);
                if (rateLimitInfo.shouldRetry) {
                    errorMessage = rateLimitInfo.error;
                    statusCode = common_1.HttpStatus.TOO_MANY_REQUESTS;
                }
                else if (error.message.includes('Failed wrap file content')) {
                    errorMessage = 'Some files in the repository could not be processed, but the README should still be available.';
                }
                else if (error.message.includes('fetch failed')) {
                    errorMessage = 'Failed to fetch repository from GitHub. Please check that the repository URL is correct and accessible.';
                }
                else if (error.message.includes('404') || error.message.includes('Not Found')) {
                    errorMessage = 'Repository not found. Please check that the GitHub URL is correct.';
                }
                else {
                    errorMessage = `Failed to summarize GitHub repository: ${error.message}`;
                }
            }
            throw new common_1.HttpException({ error: errorMessage }, statusCode);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.GitHubSummarizerService = GitHubSummarizerService;
exports.GitHubSummarizerService = GitHubSummarizerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [api_keys_service_1.ApiKeysService,
        github_rate_limit_service_1.GitHubRateLimitService])
], GitHubSummarizerService);
//# sourceMappingURL=github-summarizer.service.js.map