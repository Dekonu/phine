"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "./components/sidebar";
import { SidebarToggle } from "./components/sidebar-toggle";
import { Toast } from "./components/toast";
import { MetricsCards } from "./components/metrics-cards";
import { UsageChart } from "./components/usage-chart";
import { ApiKeysTable } from "./components/api-keys-table";
import { CreateApiKeyModal } from "./components/modals/create-api-key-modal";
import { EditApiKeyModal } from "./components/modals/edit-api-key-modal";
import { ShowKeyModal } from "./components/modals/show-key-modal";
import { useApiKeys } from "./hooks/use-api-keys";
import { useMetrics } from "./hooks/use-metrics";
import { useToast } from "./hooks/use-toast";
import type { TimeRange } from "./types";

export default function DashboardsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("7D");

  const { showToast, show: showToastMessage } = useToast();
  const { metrics, loading: metricsLoading } = useMetrics();
  const {
    apiKeys,
    loading: apiKeysLoading,
    visibleKeys,
    fullKeys,
    loadingKeys,
    toggleKeyVisibility,
    createApiKey,
    updateApiKey,
    deleteApiKey,
  } = useApiKeys();

  const handleCreate = async (name: string) => {
    const createdKey = await createApiKey(name);
    setNewlyCreatedKey(createdKey.key);
    setShowCreateModal(false);
    setShowKeyModal(true);
  };

  const handleUpdate = async (id: string, name: string) => {
    await updateApiKey(id, name);
    setEditingKey(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;
    await deleteApiKey(id);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToastMessage();
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const editingKeyData = editingKey ? apiKeys.find((k) => k.id === editingKey) : null;

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Toast show={showToast} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <SidebarToggle open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main
        className={`flex-1 p-8 pt-20 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        {/* Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to Home
          </Link>
          <span className="text-zinc-400 dark:text-zinc-600">/</span>
          <span className="text-zinc-500 dark:text-zinc-400">Pages</span>
          <span className="text-zinc-400 dark:text-zinc-600">/</span>
          <span className="text-zinc-900 dark:text-zinc-50">Overview</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Overview</h1>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Operational
            </span>
          </div>
        </div>

        {/* API Usage Card with Lavender Gradient */}
        <div className="mb-8 overflow-hidden rounded-xl bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">API Usage</h2>
              <svg className="h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mb-2 text-sm text-white/90">Monthly plan</p>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-0 rounded-full bg-white/40"></div>
          </div>
          <div className="flex items-center justify-between text-sm text-white/90">
            <span>0/1,000 Credits</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">Pay as you go</span>
              <svg className="h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* API Metrics Section */}
        <div className="mb-8 space-y-6">
          <MetricsCards metrics={metrics} loading={metricsLoading} />
          <UsageChart metrics={metrics} timeRange={timeRange} onTimeRangeChange={setTimeRange} />
        </div>

        {/* API Keys Section */}
        <ApiKeysTable
          apiKeys={apiKeys}
          loading={apiKeysLoading}
          visibleKeys={visibleKeys}
          fullKeys={fullKeys}
          loadingKeys={loadingKeys}
          onToggleVisibility={toggleKeyVisibility}
          onCopy={handleCopy}
          onEdit={(key) => setEditingKey(key.id)}
          onDelete={handleDelete}
          onCreateClick={() => setShowCreateModal(true)}
        />
      </main>

      {/* Modals */}
      <CreateApiKeyModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />
      <ShowKeyModal
        open={showKeyModal}
        apiKey={newlyCreatedKey}
        onClose={() => {
          setShowKeyModal(false);
          setNewlyCreatedKey(null);
        }}
        onCopy={() => newlyCreatedKey && handleCopy(newlyCreatedKey)}
      />
      <EditApiKeyModal
        apiKey={editingKeyData ?? null}
        onClose={() => setEditingKey(null)}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
