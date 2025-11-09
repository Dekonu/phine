"use client";

import { useState } from "react";

interface CreateApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export function CreateApiKeyModal({ open, onClose, onSubmit }: CreateApiKeyModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(name);
      setName("");
    } catch (error) {
      console.error("Failed to create API key:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">Create API Key</h2>
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
              placeholder="e.g., Production API Key"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              A secure API key will be automatically generated
            </p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Usage Count
            </label>
            <input
              type="number"
              value="1000"
              disabled
              readOnly
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-600 cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Maximum number of API calls allowed (fixed at 1000)
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
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
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

