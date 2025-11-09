import type { ApiMetrics } from "../types";

interface MetricsCardsProps {
  metrics: ApiMetrics;
  loading: boolean;
}

export function MetricsCards({ metrics, loading }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Requests</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {loading ? "..." : metrics.totalRequests.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">All time</p>
          </div>
          <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
            <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Requests Today</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {loading ? "..." : metrics.requestsToday.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Last 24 hours</p>
          </div>
          <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
            <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Avg Response Time</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {loading ? "..." : metrics.avgResponseTime > 0 ? `${metrics.avgResponseTime}ms` : "0ms"}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Average</p>
          </div>
          <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
            <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Success Rate</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {loading ? "..." : `${metrics.successRate.toFixed(1)}%`}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">All requests</p>
          </div>
          <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
            <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

