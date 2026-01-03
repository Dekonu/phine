"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

export default function PlaygroundPage() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  
  // GitHub Summarizer form state
  const [githubApiKey, setGithubApiKey] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  
  const router = useRouter();

  const handleValidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Navigate to protected page with API key as query parameter
      router.push(`/protected?key=${encodeURIComponent(apiKey)}`);
    } catch (error) {
      // Error handling for navigation - non-critical, just reset loading state
      setLoading(false);
    }
  };

  const handleGitHubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGithubLoading(true);
    setGithubError(null);

    try {
      // Validate GitHub URL format
      const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+/i;
      if (!githubUrlPattern.test(githubUrl.trim())) {
        setGithubError("Invalid GitHub URL format. Expected: https://github.com/owner/repo");
        setGithubLoading(false);
        return;
      }

      // Call the GitHub summarizer API
      const response = await apiClient.summarizeGitHub(githubApiKey.trim(), githubUrl.trim());
      
      // Store the response in sessionStorage to pass to summary page
      sessionStorage.setItem('githubSummary', JSON.stringify(response));
      sessionStorage.setItem('githubRepoUrl', githubUrl.trim());
      
      // Redirect to summary page
      router.push('/summary');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to summarize repository. Please check your API key and GitHub URL.";
      setGithubError(errorMessage);
      setGithubLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex w-full flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl">
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

          {/* Two cards side by side */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* API Key Validation Card */}
            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-6">
                <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  Validate API Key
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Enter your API key to validate it and access protected resources.
                </p>
              </div>

              <form onSubmit={handleValidateSubmit} className="space-y-4">
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

            {/* GitHub Summarizer Card */}
            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-6">
                <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  GitHub Summarizer
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Generate a summary and cool facts for any GitHub repository.
                </p>
              </div>

              <form onSubmit={handleGitHubSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="githubApiKey"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    API Key
                  </label>
                  <input
                    id="githubApiKey"
                    type="text"
                    required
                    value={githubApiKey}
                    onChange={(e) => setGithubApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 font-mono text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
                    disabled={githubLoading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="githubUrl"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    GitHub Repository URL
                  </label>
                  <input
                    id="githubUrl"
                    type="url"
                    required
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
                    disabled={githubLoading}
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Enter a valid GitHub repository URL.
                  </p>
                </div>

                {githubError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {githubError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={githubLoading || !githubApiKey.trim() || !githubUrl.trim()}
                  className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {githubLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Generating Summary...
                    </span>
                  ) : (
                    "Generate Summary"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

