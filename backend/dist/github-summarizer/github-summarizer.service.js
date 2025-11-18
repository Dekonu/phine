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
const github_summarizer_response_schema_1 = require("./schemas/github-summarizer-response.schema");
let GitHubSummarizerService = class GitHubSummarizerService {
    constructor(apiKeysService) {
        this.apiKeysService = apiKeysService;
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
        let owner = null;
        let repo = null;
        let normalizedUrl = '';
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
            normalizedUrl = gitHubUrl.trim();
            if (normalizedUrl.endsWith('/')) {
                normalizedUrl = normalizedUrl.slice(0, -1);
            }
            if (normalizedUrl.endsWith('.git')) {
                normalizedUrl = normalizedUrl.slice(0, -4);
            }
            const urlMatch = normalizedUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
            if (!urlMatch) {
                throw new common_1.HttpException({ error: 'Invalid GitHub URL format' }, common_1.HttpStatus.BAD_REQUEST);
            }
            [, owner, repo] = urlMatch;
            const commonBranches = ['main', 'master', 'develop', 'dev', 'trunk'];
            let docs;
            let lastError = null;
            for (const branch of commonBranches) {
                try {
                    const loader = new GithubRepoLoader(normalizedUrl, {
                        branch: branch,
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
                    docs = await loader.load();
                    lastError = null;
                    break;
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    if (lastError.message.includes('No commit found for the ref') ||
                        lastError.message.includes('404') ||
                        lastError.message.includes('not found')) {
                        continue;
                    }
                    break;
                }
            }
            if (!docs) {
                if (lastError) {
                    let errorMessage = 'Failed to load repository from GitHub';
                    let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
                    if (lastError instanceof Error) {
                        const errorMsg = lastError.message.toLowerCase();
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
                            errorMessage = `Failed to load repository: ${lastError.message}`;
                        }
                    }
                    throw new common_1.HttpException({ error: errorMessage }, statusCode);
                }
                throw new common_1.HttpException({ error: 'Unable to determine the default branch for this repository. The repository may be empty or inaccessible.' }, common_1.HttpStatus.NOT_FOUND);
            }
            const readmeDocs = docs.filter((doc) => {
                const source = doc.metadata?.source || '';
                const fileName = source.split('/').pop() || '';
                return /^README\.md$/i.test(fileName);
            });
            if (readmeDocs.length === 0) {
                const noReadmeResponse = {
                    summary: "No README.md file found in this repository.",
                    coolFacts: ["This repository does not contain a README file."],
                    filesAnalyzed: 0,
                    repo: gitHubUrl,
                };
                const validated = github_summarizer_response_schema_1.GitHubSummarizerResponseSchema.parse(noReadmeResponse);
                await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
                return validated;
            }
            const readmeContent = readmeDocs
                .map((doc) => doc.pageContent)
                .filter((content) => content && content.trim().length > 0)
                .join("\n\n---\n\n");
            const extractInfo = (text) => {
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
            };
            const extractedInfo = extractInfo(readmeContent);
            if (!extractedInfo) {
                const errorResponse = {
                    summary: "Unable to extract summary from README. The file may be empty or in an unexpected format.",
                    coolFacts: ["The repository may not contain a valid README file."],
                    filesAnalyzed: readmeDocs.length,
                    repo: gitHubUrl,
                    readmeLength: readmeContent.length,
                };
                const validated = github_summarizer_response_schema_1.GitHubSummarizerResponseSchema.parse(errorResponse);
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
            await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
            return validatedResponse;
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
};
exports.GitHubSummarizerService = GitHubSummarizerService;
exports.GitHubSummarizerService = GitHubSummarizerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [api_keys_service_1.ApiKeysService])
], GitHubSummarizerService);
//# sourceMappingURL=github-summarizer.service.js.map