"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ApiKeysService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeysService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let ApiKeysService = ApiKeysService_1 = class ApiKeysService {
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
        this.logger = new common_1.Logger(ApiKeysService_1.name);
    }
    generateSecureApiKey() {
        const randomBytes = new Uint8Array(ApiKeysService_1.API_KEY_BYTES);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(randomBytes);
        }
        else {
            throw new Error('Cryptographic API not available');
        }
        const hexString = Array.from(randomBytes)
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
        return `${ApiKeysService_1.API_KEY_PREFIX}${hexString}`;
    }
    maskApiKey(key) {
        const minLength = ApiKeysService_1.MASK_PREFIX_LENGTH + ApiKeysService_1.MASK_SUFFIX_LENGTH;
        if (key.length <= minLength)
            return '•'.repeat(key.length);
        const prefix = key.substring(0, ApiKeysService_1.MASK_PREFIX_LENGTH);
        const suffix = key.substring(key.length - ApiKeysService_1.MASK_SUFFIX_LENGTH);
        const masked = '•'.repeat(key.length - minLength);
        return `${prefix}${masked}${suffix}`;
    }
    dbRowToApiKey(row) {
        return {
            id: row.id,
            name: row.name,
            key: row.key,
            createdAt: row.created_at || row.created_at_iso || new Date(row.created_at).toISOString(),
            lastUsed: row.last_used ? new Date(row.last_used).toISOString() : undefined,
            usageCount: row.usage_count || ApiKeysService_1.DEFAULT_USAGE_COUNT,
            remainingUses: row.remaining_uses !== undefined
                ? row.remaining_uses
                : row.usage_count || ApiKeysService_1.DEFAULT_USAGE_COUNT,
            userId: row.user_id,
        };
    }
    async getActualUsageCount(keyId) {
        try {
            const { count, error } = await this.supabaseService
                .getClient()
                .from('api_usage')
                .select('*', { count: 'exact', head: true })
                .eq('key_id', keyId);
            if (error) {
                this.logger.error(`Error getting usage count for key ${keyId}:`, error);
                return 0;
            }
            return count || 0;
        }
        catch (error) {
            this.logger.error(`Failed to get actual usage count for key ${keyId}:`, error);
            return 0;
        }
    }
    async getAllApiKeys(userId) {
        try {
            const { data, error } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) {
                this.logger.error(`Error fetching API keys for user ${userId}:`, error);
                throw error;
            }
            const keysWithUsage = await Promise.all((data || []).map(async (row) => {
                const apiKey = this.dbRowToApiKey(row);
                const actualUsage = await this.getActualUsageCount(apiKey.id);
                const remainingUses = row.remaining_uses !== undefined
                    ? row.remaining_uses
                    : apiKey.usageCount;
                return {
                    ...apiKey,
                    key: this.maskApiKey(apiKey.key),
                    remainingUses,
                    actualUsage,
                };
            }));
            return keysWithUsage;
        }
        catch (error) {
            this.logger.error(`Failed to get all API keys for user ${userId}:`, error);
            return [];
        }
    }
    async getApiKeyById(id, userId) {
        try {
            const { data, error } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return undefined;
                }
                this.logger.error(`Error fetching API key ${id} for user ${userId}:`, error);
                throw error;
            }
            if (!data)
                return undefined;
            const apiKey = this.dbRowToApiKey(data);
            const actualUsage = await this.getActualUsageCount(apiKey.id);
            return {
                ...apiKey,
                actualUsage,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get API key ${id} for user ${userId}:`, error);
            return undefined;
        }
    }
    async getApiKeyByKey(keyString) {
        try {
            const { data, error } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .select('*')
                .eq('key', keyString)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return undefined;
                }
                this.logger.error('Error fetching API key by key string:', error);
                throw error;
            }
            if (!data)
                return undefined;
            return this.dbRowToApiKey(data);
        }
        catch (error) {
            this.logger.error('Failed to get API key by key string:', error);
            return undefined;
        }
    }
    async createApiKey(name, userId) {
        try {
            const generatedKey = this.generateSecureApiKey();
            const now = new Date().toISOString();
            const { data, error } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .insert({
                name,
                key: generatedKey,
                user_id: userId,
                created_at: now,
                usage_count: ApiKeysService_1.DEFAULT_USAGE_COUNT,
                remaining_uses: ApiKeysService_1.DEFAULT_USAGE_COUNT,
            })
                .select()
                .single();
            if (error) {
                this.logger.error(`Error creating API key for user ${userId}:`, error);
                throw error;
            }
            if (!data) {
                throw new Error('Failed to create API key: no data returned');
            }
            this.logger.log(`API key created successfully for user ${userId}: ${data.id}`);
            return this.dbRowToApiKey(data);
        }
        catch (error) {
            this.logger.error(`Failed to create API key for user ${userId}:`, error);
            throw error;
        }
    }
    async updateApiKey(id, name, userId) {
        try {
            const { data, error } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .update({ name })
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                this.logger.error(`Error updating API key ${id} for user ${userId}:`, error);
                throw error;
            }
            if (!data)
                return null;
            this.logger.log(`API key ${id} updated successfully for user ${userId}`);
            return this.dbRowToApiKey(data);
        }
        catch (error) {
            this.logger.error(`Failed to update API key ${id} for user ${userId}:`, error);
            return null;
        }
    }
    async deleteApiKey(id, userId) {
        try {
            await this.supabaseService
                .getClient()
                .from('api_usage')
                .delete()
                .eq('key_id', id);
            const { error } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);
            if (error) {
                if (error.code === 'PGRST116') {
                    return false;
                }
                this.logger.error(`Error deleting API key ${id} for user ${userId}:`, error);
                throw error;
            }
            this.logger.log(`API key ${id} deleted successfully for user ${userId}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to delete API key ${id} for user ${userId}:`, error);
            return false;
        }
    }
    async checkAndConsumeUsage(keyId) {
        try {
            const { data, error: fetchError } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .select('remaining_uses')
                .eq('id', keyId)
                .single();
            if (fetchError || !data) {
                this.logger.error(`Error fetching API key ${keyId} for usage check:`, fetchError);
                return false;
            }
            const currentRemaining = data.remaining_uses || 0;
            if (currentRemaining <= 0) {
                this.logger.warn(`API key ${keyId} has no remaining uses`);
                return false;
            }
            const { data: updateData, error: updateError } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .update({
                remaining_uses: currentRemaining - 1,
                last_used: new Date().toISOString(),
            })
                .eq('id', keyId)
                .gt('remaining_uses', 0)
                .select('id')
                .single();
            if (!updateData || updateError) {
                if (updateError) {
                    this.logger.error(`Error updating remaining uses for key ${keyId}:`, updateError);
                }
                return false;
            }
            if (updateData.id !== keyId) {
                this.logger.error(`Critical error: Updated wrong key ID. Expected ${keyId}, got ${updateData.id}`);
                return false;
            }
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to check and consume usage for key ${keyId}:`, error);
            return false;
        }
    }
    async recordApiUsage(keyId, responseTime, success = true) {
        try {
            const { error: usageError } = await this.supabaseService
                .getClient()
                .from('api_usage')
                .insert({
                key_id: keyId,
                timestamp: new Date().toISOString(),
                response_time: responseTime,
                success,
            });
            if (usageError) {
                this.logger.error(`Error recording API usage for key ${keyId}:`, usageError);
                return;
            }
        }
        catch (error) {
            this.logger.error(`Failed to record API usage for key ${keyId}:`, error);
        }
    }
};
exports.ApiKeysService = ApiKeysService;
ApiKeysService.DEFAULT_USAGE_COUNT = 1000;
ApiKeysService.API_KEY_PREFIX = 'sk_live_';
ApiKeysService.API_KEY_BYTES = 32;
ApiKeysService.MASK_PREFIX_LENGTH = 8;
ApiKeysService.MASK_SUFFIX_LENGTH = 4;
exports.ApiKeysService = ApiKeysService = ApiKeysService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ApiKeysService);
//# sourceMappingURL=api-keys.service.js.map