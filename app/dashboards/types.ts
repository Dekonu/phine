export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

export interface ApiMetrics {
  totalRequests: number;
  requestsToday: number;
  avgResponseTime: number;
  successRate: number;
  usageData: Array<{ date: string; count: number }>;
}

export type TimeRange = "7D" | "30D" | "90D";

