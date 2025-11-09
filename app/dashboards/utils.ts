import type { ApiMetrics, TimeRange } from "./types";

export function maskKey(key: string): string {
  if (key.length <= 12) return "•".repeat(key.length);
  return key.substring(0, 8) + "•".repeat(key.length - 12) + key.substring(key.length - 4);
}

export function getChartData(metrics: ApiMetrics) {
  const data = metrics.usageData || [];
  if (data.length === 0) {
    // Return empty data for 7 days
    const emptyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      emptyData.push({ date: date.toISOString().split('T')[0], count: 0 });
    }
    return emptyData;
  }
  return data;
}

export function getMaxValue(metrics: ApiMetrics): number {
  const data = getChartData(metrics);
  const max = Math.max(...data.map(d => d.count), 1);
  return Math.ceil(max / 500) * 500; // Round up to nearest 500
}

export function getChartPoints(metrics: ApiMetrics) {
  const data = getChartData(metrics);
  const maxValue = getMaxValue(metrics);
  const width = 720; // 760 - 40 (margins)
  const height = 160; // 180 - 20 (margins)
  const pointCount = data.length;
  const stepX = width / (pointCount - 1 || 1);

  return data.map((point, index) => {
    const x = 40 + index * stepX;
    const y = 180 - (point.count / maxValue) * height;
    return { x, y, count: point.count };
  });
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

