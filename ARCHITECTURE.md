# Architecture Documentation

This document provides a comprehensive overview of the application architecture, design decisions, and code organization.

## 🏗️ System Architecture

### Overview

This is a **full-stack application** with a clear separation between frontend and backend:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Next.js       │         │   Nest.js       │         │   Supabase      │
│   Frontend      │◄───────►│   Backend       │◄───────►│   Database      │
│   (Port 3000)   │  HTTP   │   (Port 3001)   │  SQL    │   (PostgreSQL)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Frontend Architecture

**Framework**: Next.js 14 with App Router

**Key Features**:
- Server Components by default (minimal `'use client'` usage)
- TypeScript for type safety
- Tailwind CSS for styling
- NextAuth.js for authentication
- React Hooks for state management

**Directory Structure**:
```
app/
├── api/              # NextAuth API routes
├── components/      # Reusable React components
├── dashboards/       # Dashboard pages and components
├── playground/       # API testing playground
├── protected/        # Protected route example
├── summary/          # GitHub summary display
└── page.tsx          # Home page
```

**Key Files**:
- `lib/api-client.ts` - Centralized API client for backend communication
- `lib/auth.ts` - NextAuth configuration
- `lib/supabase-server.ts` - Server-side Supabase client
- `middleware.ts` - Next.js middleware for route protection

### Backend Architecture

**Framework**: Nest.js (Node.js framework with TypeScript)

**Key Features**:
- Modular architecture with dependency injection
- RESTful API design
- TypeScript for type safety
- Supabase for database operations
- Structured logging with NestJS Logger

**Directory Structure**:
```
backend/src/
├── api-keys/         # API key management module
├── github-summarizer/ # GitHub summarization module
├── metrics/          # Analytics module
├── validate/         # API key validation module
├── supabase/         # Supabase service module
├── common/           # Shared decorators and guards
└── app.module.ts     # Root application module
```

**Module Pattern**:
Each feature module follows Nest.js conventions:
- `*.controller.ts` - Handles HTTP requests/responses
- `*.service.ts` - Contains business logic
- `*.module.ts` - Defines module dependencies
- `dto/` - Data Transfer Objects for validation
- `interfaces/` - TypeScript interfaces

### Database Architecture

**Database**: Supabase (PostgreSQL)

**Key Tables**:
- `api_keys` - Stores user API keys with usage tracking
- `api_usage` - Tracks API usage metrics
- `users` - User information (synced from NextAuth)

**Security**:
- Row Level Security (RLS) policies ensure users can only access their own data
- Service role key used only on backend (never exposed to frontend)
- API keys are cryptographically secure and masked when displayed

## 🔐 Authentication & Authorization

### Authentication Flow

1. **User Login**: Google SSO via NextAuth.js
2. **Session Management**: NextAuth handles session cookies
3. **Backend Authentication**: User ID extracted from `X-User-ID` header
4. **Authorization**: `UserAuthGuard` validates user identity on protected endpoints

### Security Features

- **API Key Generation**: Cryptographically secure random keys
- **Key Masking**: Keys are masked when displayed (first 8 + dots + last 4 chars)
- **User Scoping**: All data is user-scoped via RLS policies
- **CORS Protection**: Configured to allow only frontend origin
- **Input Validation**: DTOs validate all incoming data

## 📡 API Design

### RESTful Endpoints

All backend endpoints are prefixed with `/api`:

**API Keys**:
- `GET /api/api-keys` - List all user's API keys
- `POST /api/api-keys` - Create new API key
- `GET /api/api-keys/:id` - Get API key (masked)
- `GET /api/api-keys/:id/reveal` - Reveal full API key
- `PUT /api/api-keys/:id` - Update API key name
- `DELETE /api/api-keys/:id` - Delete API key

**Other Endpoints**:
- `GET /api/metrics` - Get API usage metrics
- `POST /api/validate` - Validate an API key
- `POST /api/github-summarizer` - Generate GitHub repository summary

### Error Handling

All endpoints follow consistent error handling:
- HTTP status codes (400, 401, 404, 500)
- Error objects with `{ error: string }` format
- Proper logging with context (user IDs, key IDs, etc.)
- User-friendly error messages

## 🔄 Data Flow

### API Key Creation Flow

```
1. User clicks "Create API Key" in frontend
2. Frontend calls apiClient.createApiKey(name)
3. Request sent to POST /api/api-keys with X-User-ID header
4. UserAuthGuard validates user
5. ApiKeysService generates secure key
6. Key stored in database with user_id
7. Response returned with full key (only shown once)
```

### GitHub Summarization Flow

```
1. User submits GitHub URL in playground
2. Frontend calls apiClient.summarizeGitHub(apiKey, url)
3. Request sent to POST /api/github-summarizer with X-API-Key header
4. GitHubSummarizerService validates API key
5. Service fetches README from GitHub
6. OpenAI processes README content
7. Summary and cool facts extracted
8. Response cached for future requests
9. Usage tracked in api_usage table
```

## 🧩 Key Design Decisions

### Why Separate Frontend and Backend?

- **Scalability**: Can scale frontend and backend independently
- **Security**: Backend never exposes database credentials to frontend
- **Technology Flexibility**: Can swap either side without affecting the other
- **Team Collaboration**: Frontend and backend teams can work independently

### Why Nest.js?

- **TypeScript First**: Full type safety throughout
- **Modular Architecture**: Easy to organize and maintain
- **Dependency Injection**: Testable and maintainable code
- **Built-in Features**: Guards, interceptors, pipes for common patterns

### Why Supabase?

- **PostgreSQL**: Robust relational database
- **Row Level Security**: Database-level security policies
- **Real-time Capabilities**: Can add real-time features later
- **Managed Service**: No database administration needed

## 📝 Code Organization Principles

1. **Single Responsibility**: Each module/class has one clear purpose
2. **DRY (Don't Repeat Yourself)**: Shared logic in services, not duplicated
3. **Type Safety**: TypeScript interfaces for all data structures
4. **Error Handling**: Consistent error handling patterns
5. **Logging**: Comprehensive logging with context
6. **Documentation**: JSDoc comments on all public methods

## 🚀 Future Enhancements

Potential improvements and extensions:

- **Testing**: Add unit and integration tests
- **Caching**: Redis for API response caching
- **Rate Limiting**: Per-user and per-API-key rate limits
- **Webhooks**: Event notifications for API key events
- **Analytics Dashboard**: More detailed usage analytics
- **API Versioning**: Support for multiple API versions
- **Real-time Updates**: WebSocket support for live metrics

---

For setup instructions, see [README.md](./README.md).
For development process details, see [CURSOR_DEVELOPMENT.md](./CURSOR_DEVELOPMENT.md).

