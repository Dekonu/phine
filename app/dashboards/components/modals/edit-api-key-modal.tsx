"use client";

import { useState, useEffect } from "react";
import type { ApiKey } from "../../types";

interface EditApiKeyModalProps {
  apiKey: ApiKey | null;
  onClose: () => void;
  onSubmit: (id: string, name: string) => Promise<void>;
}

export function EditApiKeyModal({ apiKey, onClose, onSubmit }: EditApiKeyModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (apiKey) {
      setName(apiKey.name);
    }
  }, [apiKey]);

  if (!apiKey) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(apiKey.id, name);
      onClose();
    } catch (error) {
      console.error("Failed to update API key:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">Edit API Key</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Only the name can be updated. The API key cannot be changed.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

