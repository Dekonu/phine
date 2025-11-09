# Supabase Setup Guide

This guide will help you connect your API keys CRUD application to a Supabase database.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Step 1: Create Your Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in your project details (name, database password, region)
4. Wait for the project to be created

## Step 2: Run the Database Migration

1. In your Supabase dashboard, go to the SQL Editor
2. Open the file `supabase/migrations/001_create_api_keys_tables.sql`
3. Copy the entire SQL content
4. Paste it into the SQL Editor in Supabase
5. Click "Run" to execute the migration

This will create:
- `api_keys` table - stores your API keys
- `api_usage` table - tracks API usage/analytics
- Indexes for better query performance
- Row Level Security (RLS) enabled

## Step 3: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. You'll need three values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon" → "public")
   - **service_role key** (under "Project API keys" → "service_role" → "secret")

⚠️ **Important**: The service_role key has admin access and bypasses RLS. Keep it secret and never expose it in client-side code!

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the `phine` directory (if it doesn't exist)
2. Add the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Replace the placeholder values with your actual Supabase credentials.

## Step 5: Configure Row Level Security (Optional but Recommended)

By default, RLS is enabled but no policies are set. Since we're using the service_role key in server-side API routes, it will bypass RLS. However, if you want to add additional security:

1. Go to **Authentication** → **Policies** in your Supabase dashboard
2. Create policies for the `api_keys` and `api_usage` tables based on your authentication needs

For now, the service_role key will work for all operations.

## Step 6: Test the Connection

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Navigate to your dashboards page
3. Try creating a new API key
4. Check your Supabase dashboard → **Table Editor** → `api_keys` to see if the key was created

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure your `.env.local` file exists and contains all three required variables
- Restart your Next.js dev server after adding environment variables
- Check that variable names match exactly (case-sensitive)

### Error: "relation does not exist"
- Make sure you ran the SQL migration in Step 2
- Check the Supabase SQL Editor for any errors

### Keys not appearing in the dashboard
- Check the browser console for errors
- Check the Next.js server logs
- Verify your Supabase credentials are correct
- Check that RLS policies allow the operations (or that service_role key is being used)

## Database Schema

### `api_keys` table
- `id` (UUID) - Primary key
- `name` (TEXT) - Name of the API key
- `key` (TEXT) - The actual API key (encrypted/stored securely)
- `created_at` (TIMESTAMPTZ) - When the key was created
- `last_used` (TIMESTAMPTZ) - Last time the key was used (nullable)
- `usage_count` (INTEGER) - Maximum API calls allowed (default: 1000)

### `api_usage` table
- `id` (UUID) - Primary key
- `key_id` (UUID) - Foreign key to `api_keys.id`
- `timestamp` (TIMESTAMPTZ) - When the API was called
- `response_time` (INTEGER) - Response time in milliseconds (nullable)
- `success` (BOOLEAN) - Whether the request was successful

## Security Notes

1. **Never commit `.env.local`** - It contains sensitive credentials
2. **Service Role Key** - Only use in server-side code (API routes)
3. **Anon Key** - Safe for client-side code, but still keep it private
4. **API Keys** - Are stored in plain text in the database. Consider encrypting them if handling sensitive data
5. **RLS Policies** - Set up proper policies if you add user authentication

## Next Steps

- Add user authentication to restrict API key access
- Set up proper RLS policies
- Consider encrypting API keys at rest
- Add rate limiting based on `usage_count`
- Set up database backups

