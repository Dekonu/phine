// Shared storage for API keys
// In production, replace this with a database (PostgreSQL, MongoDB, etc.)

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

// In-memory storage (will reset on server restart)
// In production, use a database
let apiKeysStorage: ApiKey[] = [];

export function getAllApiKeys(): ApiKey[] {
  return apiKeysStorage;
}

export function getApiKeyById(id: string): ApiKey | undefined {
  return apiKeysStorage.find((k) => k.id === id);
}

export function createApiKey(name: string, key: string): ApiKey {
  const newKey: ApiKey = {
    id: crypto.randomUUID(),
    name,
    key,
    createdAt: new Date().toISOString(),
  };
  apiKeysStorage.push(newKey);
  return newKey;
}

export function updateApiKey(id: string, name: string, key: string): ApiKey | null {
  const index = apiKeysStorage.findIndex((k) => k.id === id);
  if (index === -1) return null;
  
  apiKeysStorage[index] = {
    ...apiKeysStorage[index],
    name,
    key,
  };
  return apiKeysStorage[index];
}

export function deleteApiKey(id: string): boolean {
  const index = apiKeysStorage.findIndex((k) => k.id === id);
  if (index === -1) return false;
  
  apiKeysStorage.splice(index, 1);
  return true;
}
