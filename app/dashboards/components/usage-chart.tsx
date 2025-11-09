"use client";

import type { ApiMetrics, TimeRange } from "../types";
import { getChartData, getMaxValue, getChartPoints, formatDate } from "../utils";

interface UsageChartProps {
  metrics: ApiMetrics;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

export function UsageChart({ metrics, timeRange, onTimeRangeChange }: UsageChartProps) {
  const chartData = getChartData(metrics);
  const points = getChartPoints(metrics);
  const maxValue = getMaxValue(metrics);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">API Usage Over Time</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Requests per day for the last 7 days</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onTimeRangeChange("7D")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              timeRange === "7D"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            7D
          </button>
          <button
            onClick={() => onTimeRangeChange("30D")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              timeRange === "30D"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            30D
          </button>
          <button
            onClick={() => onTimeRangeChange("90D")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              timeRange === "90D"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            90D
          </button>
        </div>
      </div>

      {/* Dynamic Line Chart using SVG */}
      <div className="h-64 w-full">
        <svg className="h-full w-full" viewBox="0 0 800 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Horizontal grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1="40"
              y1={20 + i * 40}
              x2="760"
              y2={20 + i * 40}
              stroke="rgb(228, 228, 231)"
              strokeWidth="1"
              strokeDasharray="4"
              className="dark:stroke-zinc-700"
            />
          ))}

          {points.length > 0 && (
            <>
              {/* Area fill */}
              <path
                d={`M 40 180 ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L 760 180 Z`}
                fill="url(#gradient)"
              />
              {/* Line path */}
              <path
                d={`M ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                fill="none"
                stroke="rgb(168, 85, 247)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="rgb(168, 85, 247)"
                />
              ))}
            </>
          )}

          {/* X-axis labels */}
          {chartData.map((data, index) => {
            const x = points[index]?.x || 40 + (index * 720) / (points.length - 1 || 1);
            const dayName = formatDate(data.date);
            return (
              <text
                key={index}
                x={x}
                y="195"
                textAnchor="middle"
                className="fill-zinc-500 text-xs dark:fill-zinc-400"
              >
                {dayName}
              </text>
            );
          })}

          {/* Y-axis labels */}
          {[0, 1, 2, 3, 4].map((i) => {
            const value = Math.round((maxValue / 4) * (4 - i));
            return (
              <text
                key={i}
                x="30"
                y={20 + i * 40 + 5}
                textAnchor="end"
                className="fill-zinc-500 text-xs dark:fill-zinc-400"
              >
                {value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

