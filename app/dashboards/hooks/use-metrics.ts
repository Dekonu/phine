import { useState, useEffect } from "react";
import type { ApiMetrics } from "../types";
import { apiClient } from "@/lib/api-client";

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
      setLoading(true);
      const data = await apiClient.getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      // Set default/empty metrics on error to prevent UI issues
      setMetrics({
        totalRequests: 0,
        requestsToday: 0,
        avgResponseTime: 0,
        successRate: 0,
        usageData: [],
      });
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

