# Phine - API Key Management & GitHub Summarizer

> **A full-stack application built with Cursor AI** - This project demonstrates modern web development practices and explores AI-assisted pair programming using Cursor. Built following Eden Marco's course on leveraging Cursor for efficient development workflows.

A production-ready full-stack application showcasing API key management, authentication, and AI-powered GitHub repository analysis. This project serves as a comprehensive example of building scalable applications with TypeScript, Next.js, Nest.js, and modern development tools.

## 🎯 Project Overview

This is a full-stack application that demonstrates:
- **Frontend**: Next.js with TypeScript, Tailwind CSS, and NextAuth.js
- **Backend**: Nest.js REST API with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Google SSO via NextAuth.js
- **AI Integration**: OpenAI API for GitHub repository summarization

> 📖 **For detailed information about the Cursor AI development process, see [CURSOR_DEVELOPMENT.md](./CURSOR_DEVELOPMENT.md)**

## ✨ Features

### 🔐 Authentication
- **Google SSO Login**: Users can sign in using their Google account
- Secure session management with NextAuth.js
- Protected routes and user-scoped data access

### 🔑 API Key Management
- **Create API Keys**: Generate secure, cryptographically random API keys
- **View API Keys**: See all your API keys with masked values for security
- **Update API Keys**: Rename and manage your API keys
- **Delete API Keys**: Remove API keys you no longer need
- **Usage Tracking**: Monitor API key usage, remaining uses, and analytics

### 📊 GitHub Repository Summarizer
- **AI-Powered Summaries**: Generate intelligent summaries of GitHub repositories based on their README files
- **Cool Facts Extraction**: Automatically extract interesting facts and features from repository documentation
- **Multiple Branch Support**: Automatically detects and tries common branches (main, master, develop, dev, trunk)
- **Caching**: Results are cached to improve performance and reduce API calls
- **Rate Limit Handling**: Graceful handling of GitHub API rate limits with informative error messages

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** for styling
- **NextAuth.js** for authentication
- **React Hooks** for state management

### Backend
- **Nest.js** framework
- **TypeScript**
- **LangChain.js** for GitHub repository loading
- **OpenAI API** for LLM-powered summarization
- **Supabase** for database operations

### Database
- **Supabase** (PostgreSQL)
- Row Level Security (RLS) for data protection
- User-scoped API key management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and Yarn
- Supabase account and project
- Google OAuth credentials
- OpenAI API key (optional, for enhanced summarization)
- GitHub Personal Access Token (optional, for higher rate limits)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd phine
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   yarn install
   
   # Install backend dependencies
   cd backend
   yarn install
   cd ..
   ```

3. **Set up environment variables**

   Create `.env.local` in the root directory:
   ```env
   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # API URLs
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

   Create `backend/.env`:
   ```env
   # Supabase
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Server
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   
   # Optional: For enhanced features
   GITHUB_PAT=your-github-pat
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Set up the database**

   Run the Supabase migrations in the `supabase/migrations/` directory to create the necessary tables.

5. **Run the development servers**

   ```bash
   # Terminal 1: Start backend
   cd backend
   yarn start:dev
   
   # Terminal 2: Start frontend
   yarn dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
phine/
├── app/                    # Next.js frontend (App Router)
│   ├── api/               # NextAuth API routes
│   ├── components/        # Reusable React components
│   ├── dashboards/        # Dashboard pages and components
│   ├── playground/        # API testing playground
│   ├── protected/         # Protected route example
│   └── summary/           # GitHub summary display
├── backend/                # Nest.js backend
│   └── src/
│       ├── api-keys/      # API key management module
│       ├── github-summarizer/  # GitHub summarization module
│       ├── metrics/        # Analytics module
│       ├── validate/       # API key validation module
│       ├── supabase/      # Supabase service
│       └── common/        # Shared decorators and guards
├── lib/                    # Frontend utilities
│   ├── api-client.ts      # API client for backend communication
│   ├── auth.ts            # NextAuth configuration
│   └── supabase-server.ts # Supabase server-side client
├── supabase/
│   └── migrations/        # Database migrations
└── docs/                   # Documentation files
    ├── README.md           # This file
    ├── ARCHITECTURE.md     # Architecture documentation
    ├── CURSOR_DEVELOPMENT.md  # Cursor AI development process
    └── ...                 # Other setup guides
```

> 📖 **For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

## 🔒 Security Features

- **User-scoped API Keys**: Each user can only access their own API keys
- **Row Level Security (RLS)**: Database-level security policies
- **API Key Masking**: Keys are masked when displayed for security
- **Secure Key Generation**: Cryptographically secure random key generation
- **Authentication Guards**: Protected routes and API endpoints

## 📝 API Endpoints

### API Keys
- `GET /api/api-keys` - List all API keys for authenticated user
- `POST /api/api-keys` - Create a new API key
- `GET /api/api-keys/:id` - Get API key by ID
- `PUT /api/api-keys/:id` - Update API key
- `DELETE /api/api-keys/:id` - Delete API key

### GitHub Summarizer
- `POST /api/github-summarizer` - Generate summary of a GitHub repository

### Metrics
- `GET /api/metrics` - Get API usage metrics

## 🤖 Cursor AI Development Process

This project was built as an exploration of **AI-assisted development** using Cursor. The development process involved:

### Key Cursor Workflows Explored
- **AI Pair Programming**: Leveraging Cursor's chat and autocomplete for rapid feature development
- **Code Generation**: Using Cursor to generate boilerplate, components, and API endpoints
- **Refactoring Assistance**: Utilizing AI suggestions for architecture improvements and code cleanup
- **Type Safety**: Leveraging Cursor's understanding of TypeScript to maintain type safety across the codebase
- **Documentation**: Using AI to generate comprehensive documentation and comments

### Development Highlights
- **Architecture Evolution**: Refactored from Next.js full-stack to separated frontend/backend architecture with Cursor's assistance
- **Code Quality**: Implemented consistent patterns, error handling, and logging with AI-guided best practices
- **Rapid Prototyping**: Quickly built complex features like GitHub summarization and API key management
- **Learning Acceleration**: Used Cursor to understand and implement unfamiliar technologies (Nest.js, LangChain)

### Technical Skills Demonstrated
- **Full-Stack Development**: TypeScript, Next.js 14 (App Router), Nest.js
- **Database Design**: PostgreSQL with Supabase, Row Level Security (RLS)
- **Authentication**: OAuth 2.0 with NextAuth.js, Google SSO
- **AI Integration**: OpenAI API, LangChain.js for document processing
- **API Design**: RESTful APIs with proper error handling and validation
- **Security**: API key management, user-scoped data access, secure key generation
- **Modern Tooling**: Tailwind CSS, TypeScript, ESLint, Prettier

## 🎓 Learning Objectives

This project was created to:
- **Explore Cursor AI** for pair programming and code generation (following Eden Marco's course)
- **Practice TypeScript** for type-safe, maintainable development
- **Master Next.js 14** App Router, Server Components, and modern React patterns
- **Understand Nest.js** architecture, dependency injection, and modular design
- **Implement OAuth authentication** with NextAuth.js and Google SSO
- **Work with Supabase** for database operations and Row Level Security
- **Integrate AI/LLM services** for intelligent features and document processing
- **Build production-ready applications** with proper error handling, logging, and security

## 📄 License

This is a personal project for learning and experimentation. Feel free to use it as a reference or starting point for your own projects.

## 📊 Project Statistics

- **Frontend**: ~2,000+ lines of TypeScript/React code
- **Backend**: ~1,500+ lines of TypeScript/Nest.js code
- **Database**: 3 migration files with RLS policies
- **Components**: 10+ reusable React components
- **API Endpoints**: 8+ RESTful endpoints
- **Development Time**: Built as a learning project exploring Cursor AI workflows

## 🎯 Use Cases

This project demonstrates:
- **Portfolio Project**: Showcases full-stack development skills for grad school applications
- **Learning Resource**: Example of modern TypeScript/Next.js/Nest.js architecture
- **Cursor AI Exploration**: Demonstrates AI-assisted development workflows (see [CURSOR_DEVELOPMENT.md](./CURSOR_DEVELOPMENT.md))
- **Production Patterns**: Implements best practices for security, error handling, and code organization

## 🎓 Portfolio Highlights for Grad School Applications

This project showcases:

### Technical Skills
- ✅ **Full-Stack Development**: End-to-end application development
- ✅ **Modern TypeScript**: Type-safe development across frontend and backend
- ✅ **Framework Mastery**: Next.js 14 App Router and Nest.js architecture
- ✅ **Database Design**: PostgreSQL with Row Level Security
- ✅ **Authentication & Security**: OAuth 2.0, API key management, secure practices
- ✅ **AI Integration**: LLM-powered features with OpenAI and LangChain

### Development Process
- ✅ **AI-Assisted Development**: Exploration of Cursor AI for pair programming
- ✅ **Architecture Evolution**: Refactored from monolith to microservices
- ✅ **Code Quality**: Type safety, error handling, logging, documentation
- ✅ **Best Practices**: Following industry standards and patterns

### Project Scope
- ✅ **Production-Ready Patterns**: Security, scalability, maintainability
- ✅ **Comprehensive Features**: Authentication, CRUD operations, AI features
- ✅ **Well-Documented**: README, setup guides, development process documentation

## 🙏 Acknowledgments

- **Built with [Cursor](https://cursor.sh/)** - AI-assisted development platform
- **Course Inspiration**: Following Eden Marco's course on Cursor development
- **Frameworks**: [Next.js](https://nextjs.org/) and [Nest.js](https://nestjs.com/)
- **AI Services**: [OpenAI](https://openai.com/) for LLM capabilities
- **Database**: [Supabase](https://supabase.com/) for PostgreSQL hosting
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) for OAuth

---

**Note**: This project was built as a learning exercise to explore Cursor AI and modern full-stack development. It demonstrates production-ready patterns and can serve as a reference for similar projects.
