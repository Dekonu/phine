"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PlaygroundPage() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Navigate to protected page with API key as query parameter
      router.push(`/protected?key=${encodeURIComponent(apiKey)}`);
    } catch (error) {
      console.error("Error submitting form:", error);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex w-full flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Breadcrumbs */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← Back to Home
            </Link>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <Link
              href="/dashboards"
              className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Dashboards
            </Link>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="text-zinc-900 dark:text-zinc-50">API Playground</span>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-6">
              <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                API Playground
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Enter your API key to validate it and access protected resources.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="apiKey"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  API Key
                </label>
                <input
                  id="apiKey"
                  type="text"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 font-mono text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Your API key will be validated on the next page.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !apiKey.trim()}
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Validate API Key"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

