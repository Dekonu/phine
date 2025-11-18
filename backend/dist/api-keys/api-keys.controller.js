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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeysController = void 0;
const common_1 = require("@nestjs/common");
const api_keys_service_1 = require("./api-keys.service");
const create_api_key_dto_1 = require("./dto/create-api-key.dto");
const update_api_key_dto_1 = require("./dto/update-api-key.dto");
const user_auth_guard_1 = require("../common/guards/user-auth.guard");
const user_id_decorator_1 = require("../common/decorators/user-id.decorator");
let ApiKeysController = class ApiKeysController {
    constructor(apiKeysService) {
        this.apiKeysService = apiKeysService;
    }
    async getAllApiKeys(userId) {
        return this.apiKeysService.getAllApiKeys(userId);
    }
    async getApiKeyById(id, userId) {
        const apiKey = await this.apiKeysService.getApiKeyById(id, userId);
        if (!apiKey) {
            throw new common_1.HttpException({ error: 'API key not found' }, common_1.HttpStatus.NOT_FOUND);
        }
        return {
            ...apiKey,
            key: apiKey.key.substring(0, 8) +
                '•'.repeat(apiKey.key.length - 12) +
                apiKey.key.substring(apiKey.key.length - 4),
        };
    }
    async revealApiKey(id, userId) {
        const apiKey = await this.apiKeysService.getApiKeyById(id, userId);
        if (!apiKey) {
            throw new common_1.HttpException({ error: 'API key not found' }, common_1.HttpStatus.NOT_FOUND);
        }
        return {
            id: apiKey.id,
            key: apiKey.key,
        };
    }
    async createApiKey(createApiKeyDto, userId) {
        const { name } = createApiKeyDto;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new common_1.HttpException({ error: 'Name is required and must be a non-empty string' }, common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const newApiKey = await this.apiKeysService.createApiKey(name.trim(), userId);
            return newApiKey;
        }
        catch (error) {
            console.error('Error creating API key:', error);
            throw new common_1.HttpException({ error: 'Failed to create API key' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateApiKey(id, updateApiKeyDto, userId) {
        const { name } = updateApiKeyDto;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new common_1.HttpException({ error: 'Name is required and must be a non-empty string' }, common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const updatedKey = await this.apiKeysService.updateApiKey(id, name.trim(), userId);
            if (!updatedKey) {
                throw new common_1.HttpException({ error: 'API key not found' }, common_1.HttpStatus.NOT_FOUND);
            }
            return {
                ...updatedKey,
                key: updatedKey.key.substring(0, 8) +
                    '•'.repeat(updatedKey.key.length - 12) +
                    updatedKey.key.substring(updatedKey.key.length - 4),
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException({ error: 'Failed to update API key' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteApiKey(id, userId) {
        try {
            const deleted = await this.apiKeysService.deleteApiKey(id, userId);
            if (!deleted) {
                throw new common_1.HttpException({ error: 'API key not found' }, common_1.HttpStatus.NOT_FOUND);
            }
            return { message: 'API key deleted successfully' };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException({ error: 'Failed to delete API key' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.ApiKeysController = ApiKeysController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApiKeysController.prototype, "getAllApiKeys", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ApiKeysController.prototype, "getApiKeyById", null);
__decorate([
    (0, common_1.Get)(':id/reveal'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ApiKeysController.prototype, "revealApiKey", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_api_key_dto_1.CreateApiKeyDto, String]),
    __metadata("design:returntype", Promise)
], ApiKeysController.prototype, "createApiKey", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_api_key_dto_1.UpdateApiKeyDto, String]),
    __metadata("design:returntype", Promise)
], ApiKeysController.prototype, "updateApiKey", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ApiKeysController.prototype, "deleteApiKey", null);
exports.ApiKeysController = ApiKeysController = __decorate([
    (0, common_1.Controller)('api-keys'),
    (0, common_1.UseGuards)(user_auth_guard_1.UserAuthGuard),
    __metadata("design:paramtypes", [api_keys_service_1.ApiKeysService])
], ApiKeysController);
//# sourceMappingURL=api-keys.controller.js.map