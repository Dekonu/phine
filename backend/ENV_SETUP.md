# Backend Environment Variables Setup

The backend requires environment variables to connect to Supabase. Follow these steps:

## Step 1: Create `.env` file

Create a `.env` file in the `backend/` directory with the following content:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# GitHub Configuration (Optional but recommended)
# GitHub Personal Access Token (PAT) for higher API rate limits
# Without this, you'll be limited to 60 requests/hour (unauthenticated)
# With this, you'll have 5,000 requests/hour (authenticated)
# Create a token at: https://github.com/settings/tokens
# Required scopes: public_repo (for public repositories)
GITHUB_PAT=your_github_personal_access_token
# Alternative environment variable name
# GITHUB_TOKEN=your_github_personal_access_token

# OpenAI Configuration (Optional but recommended)
# OpenAI API key for LLM-based README analysis
# Without this, the service will use manual text parsing (less accurate)
# With this, the service uses GPT-4o-mini for better extraction quality
# Get your API key at: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Step 2: Get Your Supabase Credentials

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** → Use for `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (secret) → Use for `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important**: The service_role key has admin access. Keep it secret and never commit it to version control!

## Step 2.5: Get Your GitHub Personal Access Token (Optional but Recommended)

1. Go to GitHub Settings: https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. Give it a descriptive name (e.g., "Phine Backend API")
4. Select the **public_repo** scope (for public repositories)
5. Click **Generate token**
6. Copy the token immediately (you won't be able to see it again)
7. Add it to your `.env` file as `GITHUB_PAT`

⚠️ **Important**: Keep your GitHub PAT secret and never commit it to version control!

**Benefits of using a GitHub PAT:**
- Increases rate limit from 60 requests/hour to 5,000 requests/hour
- Reduces rate limit errors significantly
- Better performance for high-volume usage

## Step 2.6: Get Your OpenAI API Key (Optional but Recommended)

1. Go to OpenAI Platform: https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click **Create new secret key**
4. Give it a name (e.g., "Phine Backend")
5. Copy the key immediately (you won't be able to see it again)
6. Add it to your `.env` file as `OPENAI_API_KEY`

⚠️ **Important**: Keep your OpenAI API key secret and never commit it to version control!

**Benefits of using an OpenAI API key:**
- Uses GPT-4o-mini for intelligent README analysis
- Better extraction quality than manual text parsing
- More accurate summaries and fact extraction
- Handles complex README structures better

## Step 3: Replace Placeholder Values

Replace the placeholder values in your `.env` file with your actual Supabase credentials.

## Example

```env
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Verify Setup

After creating the `.env` file, restart the backend server:

```bash
cd backend
yarn start:dev
```

The server should start without the "Missing Supabase environment variables" error.

