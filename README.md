# Phine - API Key Management & GitHub Summarizer

A personal project built to explore and experiment with modern web development technologies including **Cursor**, **TypeScript**, **Next.js**, and **Nest.js**. This application provides a platform for managing API keys and generating AI-powered summaries of GitHub repositories.

## 🎯 Project Overview

This is a full-stack application that demonstrates:
- **Frontend**: Next.js with TypeScript, Tailwind CSS, and NextAuth.js
- **Backend**: Nest.js REST API with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Google SSO via NextAuth.js
- **AI Integration**: OpenAI API for GitHub repository summarization

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
│   ├── dashboards/        # Dashboard pages
│   ├── playground/         # API testing playground
│   ├── summary/            # GitHub summary display
│   └── components/         # React components
├── backend/                # Nest.js backend
│   └── src/
│       ├── api-keys/       # API key management module
│       ├── github-summarizer/  # GitHub summarization module
│       ├── metrics/        # Analytics module
│       └── supabase/       # Supabase service
├── lib/                    # Frontend utilities
│   ├── api-client.ts      # API client for backend communication
│   └── supabase-server.ts # Supabase server-side client
└── supabase/
    └── migrations/        # Database migrations
```

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

## 🎓 Learning Objectives

This project was created to:
- Explore **Cursor AI** for pair programming and code generation
- Practice **TypeScript** for type-safe development
- Learn **Next.js 14** App Router and server components
- Understand **Nest.js** architecture and dependency injection
- Implement **OAuth authentication** with NextAuth.js
- Work with **Supabase** for database and authentication
- Integrate **AI/LLM** services for intelligent features

## 📄 License

This is a personal project for learning and experimentation. Feel free to use it as a reference or starting point for your own projects.

## 🙏 Acknowledgments

- Built with [Cursor](https://cursor.sh/) for AI-assisted development
- Uses [Next.js](https://nextjs.org/) and [Nest.js](https://nestjs.com/) frameworks
- Powered by [OpenAI](https://openai.com/) for AI capabilities
- Database hosted on [Supabase](https://supabase.com/)

---

**Note**: This is a personal project meant for learning and experimentation. It may not be production-ready and should be used as a learning resource.
