-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used TIMESTAMPTZ,
  usage_count INTEGER NOT NULL DEFAULT 1000
);

-- Create api_usage table for tracking API calls
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time INTEGER,
  success BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_usage_key_id ON api_usage(key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);

-- Enable Row Level Security (RLS)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication needs)
-- For now, we'll allow all operations if you're using service role key
-- In production, you should set up proper authentication

-- Allow all operations for service role (used in server-side code)
-- This assumes you're using the service role key in your API routes
-- For better security, create authenticated policies

