import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';
import {
  GitHubSummarizerResponseSchema,
  GitHubSummarizerResponse,
} from './schemas/github-summarizer-response.schema';

@Injectable()
export class GitHubSummarizerService {
  constructor(
    private readonly apiKeysService: ApiKeysService,
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

        // Try common branch names directly with the loader
        // This avoids rate limit issues from GitHub API calls
        const commonBranches = ['main', 'master', 'develop', 'dev', 'trunk'];
        let docs;
        let lastError: Error | null = null;

        for (const branch of commonBranches) {
          try {
            const loader = new GithubRepoLoader(normalizedUrl, {
              branch: branch,
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

            docs = await loader.load();
            lastError = null;
            break; // Success, exit loop
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            // If it's a branch not found error, try next branch
            if (lastError.message.includes('No commit found for the ref') ||
                lastError.message.includes('404') ||
                lastError.message.includes('not found')) {
              continue; // Try next branch
            }
            
            // For other errors (rate limit, access denied, etc.), throw immediately
            break;
          }
        }

        // If we exhausted all branches without success
        if (!docs) {
          // If we have an error, use it to determine the status code
          if (lastError) {
          // Determine appropriate status code based on error type
          let errorMessage = 'Failed to load repository from GitHub';
          let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

          if (lastError instanceof Error) {
            const errorMsg = lastError.message.toLowerCase();
            
            // Rate limit errors
            if (errorMsg.includes('rate limit') || 
                errorMsg.includes('429') ||
                errorMsg.includes('too many requests') ||
                errorMsg.includes('api rate limit')) {
              statusCode = HttpStatus.TOO_MANY_REQUESTS;
              errorMessage = 'GitHub API rate limit exceeded';
            }
            // Not found errors
            else if (errorMsg.includes('404') || 
                     errorMsg.includes('not found') ||
                     errorMsg.includes('no commit found')) {
              statusCode = HttpStatus.NOT_FOUND;
              errorMessage = 'Repository not found or branch does not exist';
            }
            // Forbidden errors (could be rate limit or access denied)
            else if (errorMsg.includes('403') || 
                     errorMsg.includes('forbidden')) {
              // Check if it's a rate limit issue
              if (errorMsg.includes('rate limit') || errorMsg.includes('api rate limit')) {
                statusCode = HttpStatus.TOO_MANY_REQUESTS;
                errorMessage = 'GitHub API rate limit exceeded';
              } else {
                statusCode = HttpStatus.FORBIDDEN;
                errorMessage = 'Access to repository is forbidden';
              }
            }
            // Unauthorized errors
            else if (errorMsg.includes('401') || 
                     errorMsg.includes('unauthorized')) {
              statusCode = HttpStatus.UNAUTHORIZED;
              errorMessage = 'Unauthorized access to GitHub API';
            }
            // Network/fetch errors
            else if (errorMsg.includes('fetch failed') || 
                     errorMsg.includes('network') ||
                     errorMsg.includes('timeout')) {
              statusCode = HttpStatus.SERVICE_UNAVAILABLE;
              errorMessage = 'Failed to connect to GitHub API';
            }
            // Other errors - keep original message
            else {
              errorMessage = `Failed to load repository: ${lastError.message}`;
            }
          }

            throw new HttpException(
              { error: errorMessage },
              statusCode,
            );
          }
          
          // If no error but no docs, all branches failed
          throw new HttpException(
            { error: 'Unable to determine the default branch for this repository. The repository may be empty or inaccessible.' },
            HttpStatus.NOT_FOUND,
          );
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

      // If it's already an HttpException, re-throw it to preserve status code
      if (error instanceof HttpException) {
        throw error;
      }

      // Determine appropriate status code based on error type
      let errorMessage = 'Failed to summarize GitHub repository';
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        // Rate limit errors
        if (errorMsg.includes('rate limit') || 
            errorMsg.includes('429') ||
            errorMsg.includes('too many requests') ||
            errorMsg.includes('api rate limit')) {
          statusCode = HttpStatus.TOO_MANY_REQUESTS;
          errorMessage = 'GitHub API rate limit exceeded';
        }
        // Not found errors
        else if (errorMsg.includes('404') || 
                 errorMsg.includes('not found') ||
                 errorMsg.includes('no commit found')) {
          statusCode = HttpStatus.NOT_FOUND;
          errorMessage = 'Repository not found or branch does not exist';
        }
        // Forbidden errors (could be rate limit or access denied)
        else if (errorMsg.includes('403') || 
                 errorMsg.includes('forbidden')) {
          // Check if it's a rate limit issue
          if (errorMsg.includes('rate limit') || errorMsg.includes('api rate limit')) {
            statusCode = HttpStatus.TOO_MANY_REQUESTS;
            errorMessage = 'GitHub API rate limit exceeded';
          } else {
            statusCode = HttpStatus.FORBIDDEN;
            errorMessage = 'Access to repository is forbidden';
          }
        }
        // Unauthorized errors
        else if (errorMsg.includes('401') || 
                 errorMsg.includes('unauthorized')) {
          statusCode = HttpStatus.UNAUTHORIZED;
          errorMessage = 'Unauthorized access to GitHub API';
        }
        // Network/fetch errors
        else if (errorMsg.includes('fetch failed') || 
                 errorMsg.includes('network') ||
                 errorMsg.includes('timeout')) {
          statusCode = HttpStatus.SERVICE_UNAVAILABLE;
          errorMessage = 'Failed to connect to GitHub API';
        }
        // Other errors - keep original message
        else {
          errorMessage = `Failed to summarize GitHub repository: ${error.message}`;
        }
      }

      throw new HttpException(
        { error: errorMessage },
        statusCode,
      );
    }
  }

}

