const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

export interface ApiMetrics {
  totalRequests: number;
  requestsToday: number;
  avgResponseTime: number;
  successRate: number;
  usageData: Array<{ date: string; count: number }>;
}

class ApiClient {
  private baseUrl: string;
  private userId: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

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

  // API Keys endpoints
  async getAllApiKeys(): Promise<ApiKey[]> {
    return this.request<ApiKey[]>('/api/api-keys');
  }

  async getApiKeyById(id: string): Promise<ApiKey> {
    return this.request<ApiKey>(`/api/api-keys/${id}`);
  }

  async revealApiKey(id: string): Promise<{ id: string; key: string }> {
    return this.request<{ id: string; key: string }>(`/api/api-keys/${id}/reveal`);
  }

  async createApiKey(name: string): Promise<ApiKey> {
    return this.request<ApiKey>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async updateApiKey(id: string, name: string): Promise<ApiKey> {
    return this.request<ApiKey>(`/api/api-keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteApiKey(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/api-keys/${id}`, {
      method: 'DELETE',
    });
  }

  // Metrics endpoints
  async getMetrics(): Promise<ApiMetrics> {
    return this.request<ApiMetrics>('/api/metrics');
  }

  // Validate endpoint
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    return this.request<{ valid: boolean; error?: string }>('/api/validate', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    });
  }

  // GitHub Summarizer endpoint
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

// Export the apiClient instance
const apiClient = new ApiClient();
export { apiClient };
