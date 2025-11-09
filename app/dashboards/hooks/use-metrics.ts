import { useState, useEffect } from "react";
import type { ApiMetrics } from "../types";

export function useMetrics() {
  const [metrics, setMetrics] = useState<ApiMetrics>({
    totalRequests: 0,
    requestsToday: 0,
    avgResponseTime: 0,
    successRate: 0,
    usageData: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/metrics");
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return { metrics, loading, refetch: fetchMetrics };
}

