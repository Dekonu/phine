import { useState, useEffect } from "react";
import type { ApiKey } from "../types";

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [fullKeys, setFullKeys] = useState<Map<string, string>>(new Map());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/api-keys");
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const toggleKeyVisibility = async (keyId: string) => {
    const isCurrentlyVisible = visibleKeys.has(keyId);
    
    // If hiding, just update the visibility state
    if (isCurrentlyVisible) {
      setVisibleKeys((prev) => {
        const newSet = new Set(prev);
        newSet.delete(keyId);
        return newSet;
      });
      return;
    }

    // If showing and we don't have the full key, fetch it from the backend
    if (!fullKeys.has(keyId)) {
      setLoadingKeys((prev) => new Set(prev).add(keyId));
      try {
        const response = await fetch(`/api/api-keys/${keyId}/reveal`);
        if (response.ok) {
          const data = await response.json();
          setFullKeys((prev) => new Map(prev).set(keyId, data.key));
          // Show the key after fetching
          setVisibleKeys((prev) => {
            const newSet = new Set(prev);
            newSet.add(keyId);
            return newSet;
          });
        } else {
          console.error("Failed to fetch full key");
        }
      } catch (error) {
        console.error("Error fetching full key:", error);
      } finally {
        setLoadingKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(keyId);
          return newSet;
        });
      }
      return;
    }

    // Show the key if we already have it
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      newSet.add(keyId);
      return newSet;
    });
  };

  const createApiKey = async (name: string) => {
    const response = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok) {
      const createdKey = await response.json();
      setFullKeys((prev) => new Map(prev).set(createdKey.id, createdKey.key));
      await fetchApiKeys();
      return createdKey;
    }
    throw new Error("Failed to create API key");
  };

  const updateApiKey = async (id: string, name: string) => {
    const response = await fetch(`/api/api-keys/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok) {
      await fetchApiKeys();
      return true;
    }
    throw new Error("Failed to update API key");
  };

  const deleteApiKey = async (id: string) => {
    const response = await fetch(`/api/api-keys/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      await fetchApiKeys();
      return true;
    }
    throw new Error("Failed to delete API key");
  };

  return {
    apiKeys,
    loading,
    visibleKeys,
    fullKeys,
    loadingKeys,
    toggleKeyVisibility,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    refetch: fetchApiKeys,
  };
}

