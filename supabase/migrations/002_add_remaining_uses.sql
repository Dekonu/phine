-- Add remaining_uses column to api_keys table
-- This tracks how many API calls are remaining for each key
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS remaining_uses INTEGER NOT NULL DEFAULT 1000;

-- Initialize remaining_uses for existing keys based on usage_count
-- Calculate remaining uses: usage_count - actual usage
UPDATE api_keys
SET remaining_uses = GREATEST(0, usage_count - (
  SELECT COUNT(*) 
  FROM api_usage 
  WHERE api_usage.key_id = api_keys.id
));

-- If the calculation results in NULL (no usage records), set to usage_count
UPDATE api_keys
SET remaining_uses = usage_count
WHERE remaining_uses IS NULL;

