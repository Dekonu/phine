"use client";

import Link from "next/link";
import type { ApiKey } from "../types";
import { maskKey } from "../utils";

interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  loading: boolean;
  visibleKeys: Set<string>;
  fullKeys: Map<string, string>;
  loadingKeys: Set<string>;
  onToggleVisibility: (keyId: string) => void;
  onCopy: (key: string) => void;
  onEdit: (key: ApiKey) => void;
  onDelete: (id: string) => void;
  onCreateClick: () => void;
}

export function ApiKeysTable({
  apiKeys,
  loading,
  visibleKeys,
  fullKeys,
  loadingKeys,
  onToggleVisibility,
  onCopy,
  onEdit,
  onDelete,
  onCreateClick,
}: ApiKeysTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">API Keys</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                The key is used to authenticate your requests to the API. To learn more, see the{" "}
                <Link href="#" className="text-purple-600 underline transition-colors hover:text-purple-700 dark:text-purple-400">
                  documentation page
                </Link>
                .
              </p>
            </div>
            <button
              onClick={onCreateClick}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg"
            >
              + Create API Key
            </button>
          </div>
        </div>
        <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">API Keys</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                The key is used to authenticate your requests to the API. To learn more, see the{" "}
                <Link href="#" className="text-purple-600 underline transition-colors hover:text-purple-700 dark:text-purple-400">
                  documentation page
                </Link>
                .
              </p>
            </div>
            <button
              onClick={onCreateClick}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg"
            >
              + Create API Key
            </button>
          </div>
        </div>
        <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
          No API keys found. Create one to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">API Keys</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              The key is used to authenticate your requests to the API. To learn more, see the{" "}
              <Link href="#" className="text-purple-600 underline transition-colors hover:text-purple-700 dark:text-purple-400">
                documentation page
              </Link>
              .
            </p>
          </div>
          <button
            onClick={onCreateClick}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg"
          >
            + Create API Key
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Remaining / Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Key
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Options
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
            {apiKeys.map((key) => (
              <tr key={key.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {key.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                    dev
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                  <span className={key.remainingUses <= 0 ? "text-red-600 dark:text-red-400 font-medium" : key.remainingUses <= 100 ? "text-orange-600 dark:text-orange-400" : ""}>
                    {key.remainingUses ?? 0} / {key.usageCount}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span>
                      {visibleKeys.has(key.id) && fullKeys.has(key.id)
                        ? fullKeys.get(key.id)
                        : maskKey(key.key)}
                    </span>
                    <button
                      onClick={() => onToggleVisibility(key.id)}
                      disabled={loadingKeys.has(key.id)}
                      className="flex-shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      title={
                        loadingKeys.has(key.id)
                          ? "Loading..."
                          : visibleKeys.has(key.id)
                          ? "Hide key"
                          : "Show key"
                      }
                    >
                      {loadingKeys.has(key.id) ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : visibleKeys.has(key.id) ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={async () => {
                        // Always fetch the full key from the API to ensure we get the actual key
                        try {
                          const response = await fetch(`/api/api-keys/${key.id}/reveal`);
                          if (response.ok) {
                            const data = await response.json();
                            if (data.key) {
                              onCopy(data.key);
                            } else {
                              console.error("No key in response");
                            }
                          } else {
                            console.error("Failed to fetch full key:", response.statusText);
                          }
                        } catch (error) {
                          console.error("Error fetching full key:", error);
                        }
                      }}
                      className="rounded p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      title="Copy key"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onEdit(key)}
                      className="rounded p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      title="Edit key"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(key.id)}
                      className="rounded p-1.5 text-zinc-600 transition-colors hover:bg-red-100 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      title="Delete key"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

