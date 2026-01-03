/**
 * API Client for communicating with the Nest.js backend.
 * Provides a centralized interface for all API calls from the frontend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Interface representing an API key.
 */
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
  remainingUses: number;
  actualUsage?: number;
}

/**
 * Interface representing API usage metrics.
 */
export interface ApiMetrics {
  totalRequests: number;
  requestsToday: number;
  avgResponseTime: number;
  successRate: number;
  usageData: Array<{ date: string; count: number }>;
}

/**
 * Client class for making API requests to the backend.
 * Handles authentication headers, error handling, and request formatting.
 */
class ApiClient {
  private baseUrl: string;
  private userId: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Sets the user ID for authenticated requests.
   * This ID is included in the X-User-ID header for backend authentication.
   *
   * @param userId - The user ID to set, or null to clear
   */
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add user ID header if available
    if (this.userId) {
      headers['X-User-ID'] = this.userId;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Handle network errors (backend not running, CORS, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `Failed to connect to backend server at ${this.baseUrl}. ` +
          `Please ensure the backend is running and accessible. ` +
          `Check that NEXT_PUBLIC_API_URL is set correctly in your environment variables.`
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  // ========== API Keys Endpoints ==========

  /**
   * Retrieves all API keys for the authenticated user.
   *
   * @returns Promise resolving to array of API keys (with masked keys)
   */
  async getAllApiKeys(): Promise<ApiKey[]> {
    return this.request<ApiKey[]>('/api/api-keys');
  }

  /**
   * Retrieves a specific API key by ID.
   *
   * @param id - The API key ID
   * @returns Promise resolving to API key object (with masked key)
   */
  async getApiKeyById(id: string): Promise<ApiKey> {
    return this.request<ApiKey>(`/api/api-keys/${id}`);
  }

  /**
   * Reveals the full (unmasked) API key value.
   *
   * @param id - The API key ID
   * @returns Promise resolving to object with id and full key value
   */
  async revealApiKey(id: string): Promise<{ id: string; key: string }> {
    return this.request<{ id: string; key: string }>(`/api/api-keys/${id}/reveal`);
  }

  /**
   * Creates a new API key.
   *
   * @param name - The name for the new API key
   * @returns Promise resolving to the newly created API key (with full key value)
   */
  async createApiKey(name: string): Promise<ApiKey> {
    return this.request<ApiKey>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Updates an existing API key (currently only the name can be updated).
   *
   * @param id - The API key ID to update
   * @param name - The new name for the API key
   * @returns Promise resolving to updated API key object (with masked key)
   */
  async updateApiKey(id: string, name: string): Promise<ApiKey> {
    return this.request<ApiKey>(`/api/api-keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Deletes an API key.
   *
   * @param id - The API key ID to delete
   * @returns Promise resolving to success message
   */
  async deleteApiKey(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/api-keys/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== Metrics Endpoints ==========

  /**
   * Retrieves API usage metrics and statistics.
   *
   * @returns Promise resolving to ApiMetrics object
   */
  async getMetrics(): Promise<ApiMetrics> {
    return this.request<ApiMetrics>('/api/metrics');
  }

  // ========== Validation Endpoints ==========

  /**
   * Validates an API key.
   *
   * @param apiKey - The API key to validate
   * @returns Promise resolving to validation result
   */
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    return this.request<{ valid: boolean; error?: string }>('/api/validate', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    });
  }

  // ========== GitHub Summarizer Endpoints ==========

  /**
   * Generates a summary and cool facts for a GitHub repository.
   *
   * @param apiKey - The API key to use for authentication
   * @param gitHubUrl - The GitHub repository URL
   * @returns Promise resolving to summary and cool facts
   */
  async summarizeGitHub(
    apiKey: string,
    gitHubUrl: string,
  ): Promise<{
    summary: string;
    coolFacts: string[];
    filesAnalyzed: number;
    repo: string;
    readmeLength?: number;
  }> {
    return this.request<{
      summary: string;
      coolFacts: string[];
      filesAnalyzed: number;
      repo: string;
      readmeLength?: number;
    }>('/api/github-summarizer', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ gitHubUrl }),
    });
  }
}

/**
 * Singleton instance of the API client.
 * Use this instance throughout the application for making API calls.
 */
const apiClient = new ApiClient();
export { apiClient };
