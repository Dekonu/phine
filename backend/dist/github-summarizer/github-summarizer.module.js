"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubSummarizerModule = void 0;
const common_1 = require("@nestjs/common");
const github_summarizer_controller_1 = require("./github-summarizer.controller");
const github_summarizer_service_1 = require("./github-summarizer.service");
const github_rate_limit_service_1 = require("./github-rate-limit.service");
const api_keys_module_1 = require("../api-keys/api-keys.module");
let GitHubSummarizerModule = class GitHubSummarizerModule {
};
exports.GitHubSummarizerModule = GitHubSummarizerModule;
exports.GitHubSummarizerModule = GitHubSummarizerModule = __decorate([
    (0, common_1.Module)({
        imports: [api_keys_module_1.ApiKeysModule],
        controllers: [github_summarizer_controller_1.GitHubSummarizerController],
        providers: [github_summarizer_service_1.GitHubSummarizerService, github_rate_limit_service_1.GitHubRateLimitService],
    })
], GitHubSummarizerModule);
//# sourceMappingURL=github-summarizer.module.js.map