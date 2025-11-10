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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeysService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let ApiKeysService = class ApiKeysService {
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    generateSecureApiKey() {
        const randomBytes = new Uint8Array(32);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(randomBytes);
        }
        else {
            throw new Error('Cryptographic API not available');
        }
        const hexString = Array.from(randomBytes)
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
        return `sk_live_${hexString}`;
    }
    maskApiKey(key) {
        if (key.length <= 12)
            return '•'.repeat(key.length);
        const prefix = key.substring(0, 8);
        const suffix = key.substring(key.length - 4);
        const masked = '•'.repeat(key.length - 12);
        return `${prefix}${masked}${suffix}`;
    }
    dbRowToApiKey(row) {
        return {
            id: row.id,
            name: row.name,
            key: row.key,
            createdAt: row.created_at || row.created_at_iso || new Date(row.created_at).toISOString(),
            lastUsed: row.last_used ? new Date(row.last_used).toISOString() : undefined,
            usageCount: row.usage_count || 1000,
            remainingUses: row.remaining_uses !== undefined ? row.remaining_uses : row.usage_count || 1000,
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
                console.error('Error getting usage count:', error);
                return 0;
            }
            return count || 0;
        }
        catch (error) {
            console.error('Failed to get actual usage count:', error);
            return 0;
        }
    }
    async getAllApiKeys() {
        try {
            const { data, error } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                console.error('Error fetching API keys:', error);
                throw error;
            }
            const keysWithUsage = await Promise.all((data || []).map(async (row) => {
                const apiKey = this.dbRowToApiKey(row);
                const actualUsage = await this.getActualUsageCount(apiKey.id);
                const remainingUses = row.remaining_uses !== undefined ? row.remaining_uses : apiKey.usageCount;
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
            console.error('Failed to get all API keys:', error);
            return [];
        }
    }
    async getApiKeyById(id) {
        try {
            const { data, error } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return undefined;
                }
                console.error('Error fetching API key by ID:', error);
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
            console.error('Failed to get API key by ID:', error);
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
                console.error('Error fetching API key by key:', error);
                throw error;
            }
            if (!data)
                return undefined;
            return this.dbRowToApiKey(data);
        }
        catch (error) {
            console.error('Failed to get API key by key:', error);
            return undefined;
        }
    }
    async createApiKey(name) {
        try {
            const generatedKey = this.generateSecureApiKey();
            const now = new Date().toISOString();
            const { data, error } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .insert({
                name,
                key: generatedKey,
                created_at: now,
                usage_count: 1000,
                remaining_uses: 1000,
            })
                .select()
                .single();
            if (error) {
                console.error('Error creating API key:', error);
                throw error;
            }
            if (!data) {
                throw new Error('Failed to create API key: no data returned');
            }
            return this.dbRowToApiKey(data);
        }
        catch (error) {
            console.error('Failed to create API key:', error);
            throw error;
        }
    }
    async updateApiKey(id, name) {
        try {
            const { data, error } = await this.supabaseService
                .getClient()
                .from('api_keys')
                .update({ name })
                .eq('id', id)
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error('Error updating API key:', error);
                throw error;
            }
            if (!data)
                return null;
            return this.dbRowToApiKey(data);
        }
        catch (error) {
            console.error('Failed to update API key:', error);
            return null;
        }
    }
    async deleteApiKey(id) {
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
                .eq('id', id);
            if (error) {
                if (error.code === 'PGRST116') {
                    return false;
                }
                console.error('Error deleting API key:', error);
                throw error;
            }
            return true;
        }
        catch (error) {
            console.error('Failed to delete API key:', error);
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
                console.error('Error fetching API key for usage check:', fetchError);
                return false;
            }
            const currentRemaining = data.remaining_uses || 0;
            if (currentRemaining <= 0) {
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
                    console.error('Error updating remaining uses:', updateError);
                }
                return false;
            }
            if (updateData.id !== keyId) {
                console.error('Critical error: Updated wrong key ID');
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Failed to check and consume usage:', error);
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
                console.error('Error recording API usage:', usageError);
                return;
            }
        }
        catch (error) {
            console.error('Failed to record API usage:', error);
        }
    }
};
exports.ApiKeysService = ApiKeysService;
exports.ApiKeysService = ApiKeysService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ApiKeysService);
//# sourceMappingURL=api-keys.service.js.map