import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';
import {
  GitHubSummarizerResponseSchema,
  GitHubSummarizerResponse,
} from './schemas/github-summarizer-response.schema';
import { GitHubCacheService } from './github-cache.service';

@Injectable()
export class GitHubSummarizerService {
  private readonly githubToken: string | undefined;
  private readonly openAIApiKey: string | undefined;

  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly cacheService: GitHubCacheService,
  ) {
    // Get GitHub PAT from environment variables
    this.githubToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    // Get OpenAI API key from environment variables
    this.openAIApiKey = process.env.OPENAI_API_KEY;
  }

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

    // Normalize GitHub URL for caching
    let normalizedUrl = gitHubUrl.trim();
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }
    if (normalizedUrl.endsWith('.git')) {
      normalizedUrl = normalizedUrl.slice(0, -4);
    }

    // Check cache first
    const cachedResult = this.cacheService.get(normalizedUrl);
    if (cachedResult) {
      console.log(`[GitHub Summarizer] Returning cached result for ${normalizedUrl}`);
      return cachedResult;
    }

      // Use langchain to load and summarize only the README file
      let usageConsumed = false;
      const keyIdForUsage = freshKey.id;
      let owner: string | null = null;
      let repo: string | null = null;
      
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

        // Extract owner and repo from URL
        const urlMatch = normalizedUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
        if (!urlMatch) {
          throw new HttpException(
            { error: 'Invalid GitHub URL format' },
            HttpStatus.BAD_REQUEST,
          );
        }
        [, owner, repo] = urlMatch;

        // Optimized approach: Try to fetch README directly from GitHub API first (much faster)
        let readmeContent: string | null = null;
        let lastError: Error | null = null;
        let rateLimitReset: number | undefined;
        let rateLimitRemaining: number | undefined;

        // Try to get README directly from GitHub API (faster than loading entire repo)
        const commonBranches = ['main', 'master', 'develop', 'dev', 'trunk'];
        for (const branch of commonBranches) {
          try {
            const headers: Record<string, string> = {
              Accept: 'application/vnd.github.v3.raw',
              'User-Agent': 'GitHub-Summarizer',
            };
            
            if (this.githubToken) {
              headers.Authorization = `Bearer ${this.githubToken}`;
            }

            const response = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/README.md?ref=${branch}`,
              { headers }
            );

            // Check rate limit headers
            const resetHeader = response.headers.get('x-ratelimit-reset');
            const remainingHeader = response.headers.get('x-ratelimit-remaining');
            if (resetHeader) rateLimitReset = parseInt(resetHeader, 10);
            if (remainingHeader) rateLimitRemaining = parseInt(remainingHeader, 10);

            if (response.ok) {
              readmeContent = await response.text();
              break; // Success
            } else if (response.status === 404) {
              continue; // Try next branch
            } else if (response.status === 429) {
              throw new Error('GitHub API rate limit exceeded');
            } else {
              throw new Error(`GitHub API error: ${response.status}`);
            }
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (lastError.message.includes('rate limit') || lastError.message.includes('429')) {
              break; // Stop trying branches on rate limit
            }
            // Continue to next branch for 404 errors
            if (!lastError.message.includes('404')) {
              break;
            }
          }
        }

        // Fallback to LangChain loader if direct API fetch failed
        let docs: any[] = [];
        if (!readmeContent) {
          try {
            // Build loader options - non-recursive for speed, only root README
            const loaderOptions: any = {
              branch: 'main', // Try main first
              recursive: false, // Don't recurse - much faster
              unknown: "ignore",
              fileGlob: ["README.md"], // Only root README
            };

            if (this.githubToken) {
              loaderOptions.accessToken = this.githubToken;
            }

            const loader = new GithubRepoLoader(normalizedUrl, loaderOptions);
            docs = await loader.load();
          } catch (error) {
            // If loader also fails, we'll handle it below
            if (!lastError) {
              lastError = error instanceof Error ? error : new Error(String(error));
            }
          }
        }

        // Process the README content
        let readmeDocs: any[] = [];
        
        if (readmeContent) {
          // Create a document from the direct API fetch
          readmeDocs = [{
            pageContent: readmeContent,
            metadata: { source: 'README.md' },
          }];
        } else if (docs && docs.length > 0) {
          // Filter documents to only include README files
          readmeDocs = docs.filter((doc) => {
            const source = doc.metadata?.source || '';
            const fileName = source.split('/').pop() || '';
            return /^README\.md$/i.test(fileName);
          });
        }

        // If we couldn't get any README content
        if (readmeDocs.length === 0) {
          // If we have an error, use it to determine the status code
          if (lastError) {
            // Determine appropriate status code based on error type
            let errorMessage = 'Failed to load repository from GitHub';
            let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
            const errorResponse: any = { error: errorMessage };

            if (lastError instanceof Error) {
              const errorMsg = lastError.message.toLowerCase();
              
              // Rate limit errors - include reset time if available
              if (errorMsg.includes('rate limit') || 
                  errorMsg.includes('429') ||
                  errorMsg.includes('too many requests') ||
                  errorMsg.includes('api rate limit')) {
                statusCode = HttpStatus.TOO_MANY_REQUESTS;
                errorMessage = 'GitHub API rate limit exceeded';
                
                // Add rate limit information to response
                if (rateLimitReset) {
                  errorResponse.rateLimitReset = new Date(rateLimitReset * 1000).toISOString();
                  const waitTime = Math.max(0, rateLimitReset - Math.floor(Date.now() / 1000));
                  errorResponse.waitTimeSeconds = waitTime;
                }
                if (rateLimitRemaining !== undefined) {
                  errorResponse.rateLimitRemaining = rateLimitRemaining;
                }
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
                  
                  // Add rate limit information to response
                  if (rateLimitReset) {
                    errorResponse.rateLimitReset = new Date(rateLimitReset * 1000).toISOString();
                    const waitTime = Math.max(0, rateLimitReset - Math.floor(Date.now() / 1000));
                    errorResponse.waitTimeSeconds = waitTime;
                  }
                  if (rateLimitRemaining !== undefined) {
                    errorResponse.rateLimitRemaining = rateLimitRemaining;
                  }
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

            errorResponse.error = errorMessage;
            throw new HttpException(errorResponse, statusCode);
          }
          
          // If no error but no README content, repository might not have README
          const noReadmeResponse: GitHubSummarizerResponse = {
            summary: "No README.md file found in this repository.",
            coolFacts: ["This repository does not contain a README file."],
            filesAnalyzed: 0,
            repo: gitHubUrl,
          };
          
          // Validate with Zod
          const validated = GitHubSummarizerResponseSchema.parse(noReadmeResponse);
          
          // Cache the result for future requests
          this.cacheService.set(normalizedUrl, validated);
          
          // Record API usage for analytics
          await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
          
          return validated;
        }

        // Get the final README content
        // If we got it from direct API fetch, use that; otherwise combine from docs
        const finalReadmeContent = readmeContent || readmeDocs
          .map((doc) => doc.pageContent)
          .filter((content) => content && content.trim().length > 0)
          .join("\n\n---\n\n");

        // Skip if content looks like it's not a README (e.g., .gitignore content)
        if (finalReadmeContent.includes('See https://help.github.com/articles/ignoring-files/')) {
          const errorResponse: GitHubSummarizerResponse = {
            summary: "Unable to extract summary from README. The file may be empty or in an unexpected format.",
            coolFacts: ["The repository may not contain a valid README file."],
            filesAnalyzed: readmeDocs.length,
            repo: gitHubUrl,
            readmeLength: finalReadmeContent.length,
          };
          
          const validated = GitHubSummarizerResponseSchema.parse(errorResponse);
          this.cacheService.set(normalizedUrl, validated);
          await this.apiKeysService.recordApiUsage(keyIdForUsage, undefined, true);
          return validated;
        }

        // Extract key information from README using LangChain with structured output
        let extractedInfo: { summary: string; coolFacts: string[] } | null = null;

        if (this.openAIApiKey) {
          try {
            // Dynamically import LangChain modules
            const { ChatOpenAI } = require('@langchain/openai');

            // Create the model
            const model = new ChatOpenAI({
              model: 'gpt-4o-mini',
              temperature: 0.3,
              apiKey: this.openAIApiKey,
            });

            // Define the schema for structured output (only summary and coolFacts)
            const outputSchema = GitHubSummarizerResponseSchema.pick({
              summary: true,
              coolFacts: true,
            });

            // Bind structured output to the model using the Zod schema
            const structuredModel = model.withStructuredOutput(outputSchema, {
              name: 'GitHubSummarizerResponse',
            });

            // Limit content to first 4000 chars for faster processing (most READMEs have key info at top)
            const limitedContent = finalReadmeContent.substring(0, 4000);
            
            // Create concise prompt for faster LLM response
            const prompt = `Extract from this README:
1. Summary (max 300 chars): What is this project?
2. 3-5 cool facts: Key features, tech stack, notable aspects

Rules: Plain text only, no HTML/Markdown/badges/images/links.

README:
${limitedContent}${finalReadmeContent.length > 4000 ? '...' : ''}`;

            // Invoke the model with structured output
            const result = await structuredModel.invoke(prompt);
            
            // Clean HTML/Markdown tags from the results
            const cleanSummary = this.cleanText(result.summary || 'A well-documented project with comprehensive information.');
            const cleanFacts = (result.coolFacts && result.coolFacts.length > 0 
              ? result.coolFacts.slice(0, 5).map(fact => this.cleanText(fact))
              : ['This project has a comprehensive README with detailed documentation.']);

            extractedInfo = {
              summary: cleanSummary,
              coolFacts: cleanFacts,
            };
          } catch (error) {
            console.error('[GitHub Summarizer] Error using LLM for extraction:', error);
            // Fall back to manual extraction if LLM fails
            extractedInfo = this.extractInfoManually(finalReadmeContent);
          }
        } else {
          // Fall back to manual extraction if no OpenAI API key
          console.warn('[GitHub Summarizer] OPENAI_API_KEY not set, using manual extraction');
          extractedInfo = this.extractInfoManually(finalReadmeContent);
        }

      if (!extractedInfo) {
        // Return validated response even for error case
        const errorResponse: GitHubSummarizerResponse = {
          summary: "Unable to extract summary from README. The file may be empty or in an unexpected format.",
          coolFacts: ["The repository may not contain a valid README file."],
          filesAnalyzed: readmeDocs.length,
          repo: gitHubUrl,
          readmeLength: finalReadmeContent.length,
        };
        
        // Validate with Zod
        const validated = GitHubSummarizerResponseSchema.parse(errorResponse);
        
        // Cache the result for future requests
        this.cacheService.set(normalizedUrl, validated);
        
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

      // Cache the result for future requests
      this.cacheService.set(normalizedUrl, validatedResponse);

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

  /**
   * Clean HTML and Markdown tags from text
   */
  private cleanText(text: string): string {
    if (!text) return text;
    
    // Remove HTML tags
    let cleaned = text.replace(/<[^>]*>/g, '');
    
    // Remove Markdown images and links but keep the text
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1'); // Markdown images: ![alt](url) -> alt
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // Markdown links: [text](url) -> text
    
    // Remove markdown badges and shields
    cleaned = cleaned.replace(/!\[.*?\]\(https?:\/\/[^\)]+\)/g, '');
    
    // Remove markdown headers (# ## ###)
    cleaned = cleaned.replace(/^#+\s+/gm, '');
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
    cleaned = cleaned.replace(/`[^`]+`/g, ''); // Inline code
    
    // Remove markdown bold/italic but keep text
    cleaned = cleaned.replace(/\*\*([^\*]+)\*\*/g, '$1'); // Bold
    cleaned = cleaned.replace(/\*([^\*]+)\*/g, '$1'); // Italic
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1'); // Bold underscore
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1'); // Italic underscore
    
    // Remove markdown lists
    cleaned = cleaned.replace(/^[\*\-\+]\s+/gm, '');
    cleaned = cleaned.replace(/^\d+\.\s+/gm, '');
    
    // Remove markdown tables
    cleaned = cleaned.replace(/\|.*?\|/g, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Remove any remaining special characters that might be artifacts
    cleaned = cleaned.replace(/[^\w\s\.\,\!\?\:\;\-\(\)]/g, ' ');
    
    // Final cleanup of whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Manual extraction fallback method (used when OpenAI API key is not available)
   */
  private extractInfoManually(text: string): { summary: string; coolFacts: string[] } | null {
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
  }
}

