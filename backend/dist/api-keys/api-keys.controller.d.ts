import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
export declare class ApiKeysController {
    private readonly apiKeysService;
    constructor(apiKeysService: ApiKeysService);
    getAllApiKeys(userId: string): Promise<import("./interfaces/api-key.interface").ApiKey[]>;
    getApiKeyById(id: string, userId: string): Promise<{
        key: string;
        id: string;
        name: string;
        createdAt: string;
        lastUsed?: string;
        usageCount: number;
        remainingUses: number;
        actualUsage?: number;
        userId?: string;
    }>;
    revealApiKey(id: string, userId: string): Promise<{
        id: string;
        key: string;
    }>;
    createApiKey(createApiKeyDto: CreateApiKeyDto, userId: string): Promise<import("./interfaces/api-key.interface").ApiKey>;
    updateApiKey(id: string, updateApiKeyDto: UpdateApiKeyDto, userId: string): Promise<{
        key: string;
        id: string;
        name: string;
        createdAt: string;
        lastUsed?: string;
        usageCount: number;
        remainingUses: number;
        actualUsage?: number;
        userId?: string;
    }>;
    deleteApiKey(id: string, userId: string): Promise<{
        message: string;
    }>;
}
