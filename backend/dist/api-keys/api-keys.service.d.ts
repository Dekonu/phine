import { SupabaseService } from '../supabase/supabase.service';
import { ApiKey } from './interfaces/api-key.interface';
export declare class ApiKeysService {
    private supabaseService;
    private readonly logger;
    private static readonly DEFAULT_USAGE_COUNT;
    private static readonly API_KEY_PREFIX;
    private static readonly API_KEY_BYTES;
    private static readonly MASK_PREFIX_LENGTH;
    private static readonly MASK_SUFFIX_LENGTH;
    constructor(supabaseService: SupabaseService);
    private generateSecureApiKey;
    private maskApiKey;
    private dbRowToApiKey;
    private getActualUsageCount;
    getAllApiKeys(userId: string): Promise<ApiKey[]>;
    getApiKeyById(id: string, userId: string): Promise<ApiKey | undefined>;
    getApiKeyByKey(keyString: string): Promise<ApiKey | undefined>;
    createApiKey(name: string, userId: string): Promise<ApiKey>;
    updateApiKey(id: string, name: string, userId: string): Promise<ApiKey | null>;
    deleteApiKey(id: string, userId: string): Promise<boolean>;
    checkAndConsumeUsage(keyId: string): Promise<boolean>;
    recordApiUsage(keyId: string, responseTime?: number, success?: boolean): Promise<void>;
}
