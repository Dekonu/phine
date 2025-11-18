import { useState, useEffect } from "react";
import type { ApiKey } from "../types";
import { apiClient } from "@/lib/api-client";

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [fullKeys, setFullKeys] = useState<Map<string, string>>(new Map());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAllApiKeys();
      setApiKeys(data);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
      // Set empty array on error to prevent UI issues
      setApiKeys([]);
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
        const data = await apiClient.revealApiKey(keyId);
        setFullKeys((prev) => new Map(prev).set(keyId, data.key));
        // Show the key after fetching
        setVisibleKeys((prev) => {
          const newSet = new Set(prev);
          newSet.add(keyId);
          return newSet;
        });
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
    try {
      const createdKey = await apiClient.createApiKey(name);
      setFullKeys((prev) => new Map(prev).set(createdKey.id, createdKey.key));
      await fetchApiKeys();
      return createdKey;
    } catch (error) {
      console.error("Failed to create API key:", error);
      throw new Error("Failed to create API key");
    }
  };

  const updateApiKey = async (id: string, name: string) => {
    try {
      await apiClient.updateApiKey(id, name);
      await fetchApiKeys();
      return true;
    } catch (error) {
      console.error("Failed to update API key:", error);
      throw new Error("Failed to update API key");
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      await apiClient.deleteApiKey(id);
      await fetchApiKeys();
      return true;
    } catch (error) {
      console.error("Failed to delete API key:", error);
      throw new Error("Failed to delete API key");
    }
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

