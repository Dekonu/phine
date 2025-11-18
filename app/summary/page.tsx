"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface GitHubSummary {
  summary: string;
  coolFacts: string[];
  filesAnalyzed: number;
  repo: string;
  readmeLength?: number;
}

export default function SummaryPage() {
  const [summary, setSummary] = useState<GitHubSummary | null>(null);
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get summary data from sessionStorage
    const summaryData = sessionStorage.getItem('githubSummary');
    const repoUrlData = sessionStorage.getItem('githubRepoUrl');

    if (summaryData) {
      try {
        const parsed = JSON.parse(summaryData);
        setSummary(parsed);
        setRepoUrl(repoUrlData || parsed.repo || '');
      } catch (error) {
        console.error('Error parsing summary data:', error);
      }
    } else {
      // If no data, redirect back to playground
      router.push('/playground');
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400">No summary data found.</p>
          <Link
            href="/playground"
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800"
          >
            Go to Playground
          </Link>
        </div>
      </div>
    );
  }

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
              href="/playground"
              className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Playground
            </Link>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="text-zinc-900 dark:text-zinc-50">Summary</span>
          </div>

          {/* Main Content Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {/* Header */}
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    Repository Summary
                  </h1>
                  {repoUrl && (
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      {repoUrl}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Summary
              </h2>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {summary.summary}
                </p>
              </div>
            </div>

            {/* Cool Facts Section */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Cool Facts
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {summary.coolFacts.map((fact, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-5 transition-all hover:border-purple-300 hover:shadow-md dark:border-zinc-800 dark:from-purple-900/20 dark:to-purple-800/10 dark:hover:border-purple-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-sm">
                        <span className="text-sm font-bold">{index + 1}</span>
                      </div>
                      <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {fact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-800/30">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 dark:text-zinc-400">Files Analyzed:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {summary.filesAnalyzed}
                </span>
              </div>
              {summary.readmeLength && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400">README Length:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {summary.readmeLength.toLocaleString()} characters
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-3">
              <Link
                href="/playground"
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Generate Another Summary
              </Link>
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-center text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg"
                >
                  View on GitHub
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

