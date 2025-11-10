import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { GitHubRateLimitService } from './github-rate-limit.service';
import {
  GitHubSummarizerResponseSchema,
  GitHubSummarizerResponse,
} from './schemas/github-summarizer-response.schema';

@Injectable()
export class GitHubSummarizerService {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly rateLimitService: GitHubRateLimitService,
  ) {}

  async processRequest(apiKey: string, gitHubUrl: string) {
    const originalApiKey = apiKey.trim();

    // Validate API key against database
    const key = await this.apiKeysService.getApiKeyByKey(originalApiKey);

    if (!key) {
      throw new HttpException({ error: 'Invalid API key' }, HttpStatus.UNAUTHORIZED);
    }

    // Fetch fresh data from database to ensure we have current remaining uses
    const freshKey = await this.apiKeysService.getApiKeyById(key.id);
    if (!freshKey) {
      throw new HttpException({ error: 'API key not found' }, HttpStatus.UNAUTHORIZED);
    }

    // Verify key string matches (safety check)
    if (freshKey.key !== originalApiKey) {
      console.error('[GitHub Summarizer] API key validation error: key mismatch');
      throw new HttpException({ error: 'API key validation error' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Check if API key has remaining uses
    if (freshKey.remainingUses <= 0) {
      throw new HttpException(
        {
          error: 'API key usage limit exceeded',
          remainingUses: freshKey.remainingUses || 0,
          usageCount: freshKey.usageCount,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!gitHubUrl || typeof gitHubUrl !== 'string' || gitHubUrl.trim().length === 0) {
      throw new HttpException(
        { error: 'gitHubUrl is required in the request body' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate GitHub URL format
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+/i;
    if (!githubUrlPattern.test(gitHubUrl.trim())) {
      throw new HttpException(
        { error: 'Invalid GitHub URL format. Expected format: https://github.com/owner/repo' },
        HttpStatus.BAD_REQUEST,
      );
    }

      // Use langchain to load and summarize only the README file
      let usageConsumed = false;
      const keyIdForUsage = freshKey.id;
      let owner: string | null = null;
      let repo: string | null = null;
      let normalizedUrl: string = '';
      
      try {
        // Consume usage only after validation passes
        const hasRemainingUses = await this.apiKeysService.checkAndConsumeUsage(keyIdForUsage);
        if (!hasRemainingUses) {
          throw new HttpException(
            {
              error: 'API key usage limit exceeded',
              remainingUses: freshKey.remainingUses || 0,
              usageCount: freshKey.usageCount,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        usageConsumed = true;

        // Check GitHub API rate limits before making requests
        // Note: We check without auth token since GithubRepoLoader may use unauthenticated requests
        const rateLimitCheck = await this.rateLimitService.checkRateLimit();
        
        if (!rateLimitCheck.canProceed) {
          throw new HttpException(
            {
              error: rateLimitCheck.error || 'GitHub API rate limit exceeded',
              rateLimitReset: rateLimitCheck.status?.reset
                ? new Date(rateLimitCheck.status.reset * 1000).toISOString()
                : undefined,
              waitTime: rateLimitCheck.waitTime,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        // Warn if rate limit is low but still allow
        if (rateLimitCheck.error && rateLimitCheck.status) {
          console.warn(
            `[GitHub Summarizer] Rate limit warning: ${rateLimitCheck.status.remaining} requests remaining. Reset at ${new Date(rateLimitCheck.status.reset * 1000).toISOString()}`,
          );
        }

        // Dynamically import required langchain modules for Github repo loading
        // Using require for CommonJS compatibility in NestJS
        const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');

        // Normalize GitHub URL - ensure it's in the correct format
        normalizedUrl = gitHubUrl.trim();
        // Remove trailing slash
        if (normalizedUrl.endsWith('/')) {
          normalizedUrl = normalizedUrl.slice(0, -1);
        }
        // Remove .git extension if present
        if (normalizedUrl.endsWith('.git')) {
          normalizedUrl = normalizedUrl.slice(0, -4);
        }

        // Extract owner and repo from URL
        const urlMatch = normalizedUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
        if (!urlMatch) {
          throw new HttpException(
            { error: 'Invalid GitHub URL format' },
            HttpStatus.BAD_REQUEST,
          );
        }
        [, owner, repo] = urlMatch;

        // Try to detect the default branch
        let defaultBranch = await this.detectDefaultBranch(owner, repo);
        
        // If detection fails, try common branch names
        const commonBranches = ['main', 'master', 'develop', 'dev', 'trunk'];
        if (!defaultBranch) {
          defaultBranch = await this.tryBranches(owner, repo, commonBranches);
        }

        if (!defaultBranch) {
          throw new HttpException(
            {
              error: 'Unable to determine the default branch for this repository. The repository may be empty or inaccessible.',
            },
            HttpStatus.NOT_FOUND,
          );
        }

        // Set up the loader to only load README files
        const loader = new GithubRepoLoader(normalizedUrl, {
          branch: defaultBranch,
          recursive: true, // Need recursive to find README files in subdirectories
          unknown: "ignore", // Ignore unknown file types to prevent errors
          // Only load README files - be more specific
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

        // Load documents and filter to only README files
        // Implement retry logic with exponential backoff for rate limit errors
        let docs;
        const maxRetries = 3;
        let retryCount = 0;
        let lastError: Error | null = null;

        while (retryCount <= maxRetries) {
          try {
            docs = await loader.load();
            lastError = null;
            break; // Success, exit retry loop
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Suppress "Failed wrap file content" warnings - they're non-critical
            if (lastError.message.includes('Failed wrap file content')) {
              docs = [];
              break; // Non-critical, continue
            }

            // Check if it's a branch-related error (404 for branch)
            if ((lastError.message.includes('No commit found for the ref') || 
                lastError.message.includes('404')) && owner && repo) {
              // Try alternative branches
              const alternativeBranches = ['master', 'develop', 'dev', 'trunk', 'gh-pages'];
              const foundBranch = await this.tryBranches(owner, repo, alternativeBranches);
              
              if (foundBranch && foundBranch !== defaultBranch) {
                console.warn(`[GitHub Summarizer] Retrying with branch: ${foundBranch}`);
                // Create new loader with the found branch
                const newLoader = new GithubRepoLoader(normalizedUrl, {
                  branch: foundBranch,
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
                
                try {
                  docs = await newLoader.load();
                  lastError = null;
                  break; // Success with alternative branch
                } catch (retryError) {
                  // Continue to rate limit check
                  lastError = retryError instanceof Error ? retryError : new Error(String(retryError));
                }
              }
            }

            // Check if it's a rate limit error
            const rateLimitInfo = this.rateLimitService.handleRateLimitError(lastError);
            
            if (rateLimitInfo.shouldRetry && retryCount < maxRetries) {
              retryCount++;
              const waitTime = rateLimitInfo.waitTime * Math.pow(2, retryCount - 1); // Exponential backoff
              console.warn(
                `[GitHub Summarizer] Rate limit error (attempt ${retryCount}/${maxRetries}). Waiting ${waitTime}s before retry...`,
              );
              await this.sleep(waitTime * 1000); // Convert to milliseconds
              
              // Refresh rate limit status before retry
              await this.rateLimitService.checkRateLimit();
              continue;
            }

            // If not a rate limit error or max retries reached, throw
            throw lastError;
          }
        }

        // If we exhausted retries, throw the last error
        if (lastError && !docs) {
          throw lastError;
        }

        // Filter documents to only include README files by checking metadata
        const readmeDocs = docs.filter((doc) => {
          const source = doc.metadata?.source || '';
          const fileName = source.split('/').pop() || '';
          // Match README files (case-insensitive)
          return /^README\.md$/i.test(fileName);
        });

        if (readmeDocs.length === 0) {
          const noReadmeResponse: GitHubSummarizerResponse = {
            summary: "No README.md file found in this repository.",
            coolFacts: ["This repository does not contain a README file."],
            filesAnalyzed: 0,
            repo: gitHubUrl,
          };
          
          // Validate with Zod
          const validated = GitHubSummarizerResponseSchema.parse(noReadmeResponse);
          
          // Record API usage for analytics
          await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
          
          return validated;
        }

        // Combine all README content (should typically be just one)
        const readmeContent = readmeDocs
          .map((doc) => doc.pageContent)
          .filter((content) => content && content.trim().length > 0)
          .join("\n\n---\n\n");

        // Extract key information from README using simple text analysis
        // Look for common README sections
        const extractInfo = (text: string): { summary: string; coolFacts: string[] } | null => {
        // Skip if content looks like it's not a README (e.g., .gitignore content)
        if (text.includes('See https://help.github.com/articles/ignoring-files/')) {
          return null; // This is likely .gitignore content, not README
        }

        const lines = text.split('\n');
        const sections: Record<string, string[]> = {
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
          
          // Skip empty lines at the start
          if (!foundFirstHeader && line.length === 0) {
            continue;
          }
          
          // Detect main title (first # header)
          if (line.startsWith('# ') && !foundFirstHeader) {
            const title = line.replace(/^#+\s*/, '').trim();
            if (title.length > 0) {
              sections.title.push(title);
              foundFirstHeader = true;
              currentSection = 'description';
            }
            continue;
          }
          
          // Detect section headers (## or ###)
          if (line.match(/^##+\s+/)) {
            const headerText = line.replace(/^#+\s*/, '').trim().toLowerCase();
            
            if (headerText.match(/(features?|what|about|overview)/)) {
              currentSection = 'features';
            } else if (headerText.match(/(install|setup|getting started|quick start)/)) {
              currentSection = 'installation';
            } else if (headerText.match(/(usage|how to use|example|examples|demo)/)) {
              currentSection = 'usage';
            } else if (headerText.match(/(tech|stack|built with|technologies?|tools|dependencies)/)) {
              currentSection = 'technologies';
            } else if (headerText.match(/(description|about|overview|introduction)/)) {
              currentSection = 'description';
            } else if (headerText.match(/(facts?|interesting|highlights?|notable|fun facts?)/)) {
              currentSection = 'facts';
            }
            continue;
          }
          
          // Add content to current section (skip markdown syntax, code blocks, etc.)
          if (line.length > 0 && 
              !line.startsWith('#') && 
              !line.startsWith('```') &&
              !line.startsWith('|') && // Skip markdown tables
              !line.match(/^\[.*\]\(.*\)$/) && // Skip markdown links on their own line
              line.length < 200) { // Skip very long lines (likely code blocks)
            if (sections[currentSection].length < 20) {
              sections[currentSection].push(line);
            }
          }
        }

        // Build summary from extracted sections
        const summaryParts: string[] = [];
        
        if (sections.title.length > 0) {
          summaryParts.push(sections.title[0]);
        }
        
        if (sections.description.length > 0) {
          const desc = sections.description.slice(0, 10).join(' ').trim();
          if (desc.length > 0) {
            summaryParts.push(desc);
          }
        }

        // If no structured sections found, use first meaningful content
        if (summaryParts.length === 0) {
          const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/\[.*?\]\(.*?\)/g, '').trim();
          const firstParagraph = cleanText.split('\n\n')[0] || cleanText.substring(0, 500);
          summaryParts.push(firstParagraph);
        }

        const summary = summaryParts.join('. ').substring(0, 500).trim();

        // Extract cool facts from various sections
        const coolFacts: string[] = [];
        
        // Add interesting features as facts
        if (sections.features.length > 0) {
          sections.features.slice(0, 3).forEach((feature) => {
            if (feature.length > 20 && feature.length < 150) {
              coolFacts.push(feature);
            }
          });
        }
        
        // Add technologies as facts
        if (sections.technologies.length > 0) {
          const techList = sections.technologies.slice(0, 5).join(', ');
          if (techList.length > 0) {
            coolFacts.push(`Built with: ${techList}`);
          }
        }
        
        // Add explicit facts section if found
        if (sections.facts.length > 0) {
          sections.facts.slice(0, 5).forEach((fact) => {
            if (fact.length > 20 && fact.length < 200) {
              coolFacts.push(fact);
            }
          });
        }
        
        // Extract interesting points from description if we don't have enough facts
        if (coolFacts.length < 3 && sections.description.length > 0) {
          sections.description.slice(5, 10).forEach((line) => {
            if (line.length > 30 && line.length < 150 && !coolFacts.includes(line)) {
              coolFacts.push(line);
            }
          });
        }

        // Ensure we have at least one fact
        if (coolFacts.length === 0) {
          coolFacts.push('This project has a comprehensive README with detailed documentation.');
        }

        return {
          summary: summary || 'A well-documented project with comprehensive information.',
          coolFacts: coolFacts.slice(0, 5), // Limit to 5 facts
        };
      };

      // Generate summary and cool facts from the README content
      const extractedInfo = extractInfo(readmeContent);

      if (!extractedInfo) {
        // Return validated response even for error case
        const errorResponse: GitHubSummarizerResponse = {
          summary: "Unable to extract summary from README. The file may be empty or in an unexpected format.",
          coolFacts: ["The repository may not contain a valid README file."],
          filesAnalyzed: readmeDocs.length,
          repo: gitHubUrl,
          readmeLength: readmeContent.length,
        };
        
        // Validate with Zod
        const validated = GitHubSummarizerResponseSchema.parse(errorResponse);
        
        // Record API usage for analytics
        await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
        
        return validated;
      }

      // Build response object
      const response: GitHubSummarizerResponse = {
        summary: extractedInfo.summary,
        coolFacts: extractedInfo.coolFacts,
        filesAnalyzed: readmeDocs.length,
        repo: gitHubUrl,
        readmeLength: readmeContent.length,
      };

      // Validate response with Zod
      const validatedResponse = GitHubSummarizerResponseSchema.parse(response);

      // Record API usage for analytics
      await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);

      return validatedResponse;
    } catch (error) {
      console.error('Error summarizing GitHub repository:', error);
      
      // If usage was consumed but request failed, record it as a failed request
      if (usageConsumed) {
        try {
          await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, false);
        } catch (recordError) {
          console.error('Error recording failed usage:', recordError);
        }
      }

      // If it's already an HttpException (like rate limit errors), re-throw it to preserve status code
      if (error instanceof HttpException) {
        throw error;
      }

      // Provide more helpful error messages for non-HttpException errors
      let errorMessage = 'Failed to summarize GitHub repository';
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      
      if (error instanceof Error) {
        // Check for rate limit errors
        const rateLimitInfo = this.rateLimitService.handleRateLimitError(error);
        if (rateLimitInfo.shouldRetry) {
          errorMessage = rateLimitInfo.error;
          statusCode = HttpStatus.TOO_MANY_REQUESTS;
        } else if (error.message.includes('Failed wrap file content')) {
          // This is a non-critical warning, try to continue
          errorMessage = 'Some files in the repository could not be processed, but the README should still be available.';
        } else if (error.message.includes('fetch failed')) {
          errorMessage = 'Failed to fetch repository from GitHub. Please check that the repository URL is correct and accessible.';
        } else if (error.message.includes('No commit found for the ref') || 
                   (error.message.includes('404') && error.message.includes('branch'))) {
          errorMessage = 'Repository branch not found. The repository may be empty or use a different branch name.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorMessage = 'Repository not found. Please check that the GitHub URL is correct and the repository is accessible.';
        } else {
          errorMessage = `Failed to summarize GitHub repository: ${error.message}`;
        }
      }

      throw new HttpException(
        { error: errorMessage },
        statusCode,
      );
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Detect the default branch of a GitHub repository
   */
  private async detectDefaultBranch(owner: string, repo: string): Promise<string | null> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.default_branch || null;
    } catch (error) {
      console.warn(`[GitHub Summarizer] Failed to detect default branch for ${owner}/${repo}:`, error);
      return null;
    }
  }

  /**
   * Try multiple branch names to find a valid one
   */
  private async tryBranches(owner: string, repo: string, branches: string[]): Promise<string | null> {
    for (const branch of branches) {
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
          method: 'GET',
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (response.ok) {
          return branch;
        }
      } catch (error) {
        // Continue to next branch
        continue;
      }
    }
    return null;
  }
}

