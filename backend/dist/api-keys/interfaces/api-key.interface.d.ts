export interface ApiKey {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    lastUsed?: string;
    usageCount: number;
    remainingUses: number;
    actualUsage?: number;
    userId?: string;
}
export interface ApiUsage {
    keyId: string;
    timestamp: string;
    responseTime?: number;
    success: boolean;
}
