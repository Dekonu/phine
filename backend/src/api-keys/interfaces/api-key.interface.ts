export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
  remainingUses: number;
  actualUsage?: number;
  userId?: string; // Optional user ID for internal use
}

export interface ApiUsage {
  keyId: string;
  timestamp: string;
  responseTime?: number;
  success: boolean;
}

