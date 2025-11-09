"use client";

import { useState } from "react";
import { maskKey } from "../../utils";

interface ShowKeyModalProps {
  open: boolean;
  apiKey: string | null;
  onClose: () => void;
  onCopy: () => void;
}

export function ShowKeyModal({ open, apiKey, onClose, onCopy }: ShowKeyModalProps) {
  const [showKey, setShowKey] = useState(false);

  if (!open || !apiKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">API Key Created</h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Make sure to copy your API key now. You won't be able to see it again!
        </p>
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
          <code className="flex-1 break-all font-mono text-xs text-zinc-900 dark:text-zinc-50">
            {showKey ? apiKey : maskKey(apiKey)}
          </code>
          <div className="flex flex-shrink-0 gap-1">
            <button
              onClick={() => setShowKey(!showKey)}
              className="rounded-lg bg-zinc-300 px-2 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-400 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? (
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
            <button
              onClick={onCopy}
              className="rounded-lg bg-zinc-400 px-3 py-1.5 text-white transition-colors hover:bg-zinc-500 dark:bg-zinc-600 dark:hover:bg-zinc-500"
              title="Copy to clipboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg"
        >
          I've copied the key
        </button>
      </div>
    </div>
  );
}

