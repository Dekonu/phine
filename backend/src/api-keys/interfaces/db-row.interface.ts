/**
 * Database row structure for api_keys table
 */
export interface ApiKeyDbRow {
  id: string;
  name: string;
  key: string;
  user_id?: string;
  created_at: string;
  created_at_iso?: string;
  last_used?: string | null;
  usage_count: number;
  remaining_uses?: number;
}

