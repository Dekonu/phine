"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Toast } from "../dashboards/components/toast";
import { useToast } from "../dashboards/hooks/use-toast";
import { ProtectedRoute } from "../components/protected-route";
import { apiClient } from "@/lib/api-client";

function ProtectedContent() {
  const searchParams = useSearchParams();
  const apiKey = searchParams.get("key");
  const { showToast, show: showToastMessage } = useToast();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("Valid API key");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const lastValidatedKey = useRef<string | null>(null);

  useEffect(() => {
    // Only validate if we haven't validated this key yet
    if (lastValidatedKey.current === apiKey) return;
    lastValidatedKey.current = apiKey || null;

    const validateApiKey = async () => {
      if (!apiKey) {
        setIsValid(false);
        setLoading(false);
        setToastMessage("Invalid API key");
        setToastType("error");
        showToastMessage();
        return;
      }

      try {
        const data = await apiClient.validateApiKey(apiKey);
        const valid = data.valid === true;

        setIsValid(valid);
        setLoading(false);

        // Set toast message and type based on validation result
        if (valid) {
          setToastMessage("Valid API key");
          setToastType("success");
        } else {
          setToastMessage("Invalid API key");
          setToastType("error");
        }

        // Show toast notification only once per validation
        showToastMessage();
      } catch (error) {
        console.error("Error validating API key:", error);
        setIsValid(false);
        setLoading(false);
        setToastMessage("Invalid API key");
        setToastType("error");
        showToastMessage();
      }
    };

    validateApiKey();
    // Only depend on apiKey, not showToastMessage to avoid re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Validating API key...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Toast show={showToast} message={toastMessage} type={toastType} />
      
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
              href="/playground"
              className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Playground
            </Link>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="text-zinc-900 dark:text-zinc-50">Protected</span>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-6 text-center">
              {isValid ? (
                <>
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <svg
                      className="h-8 w-8 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    API Key Valid
                  </h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Your API key has been successfully validated.
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <svg
                      className="h-8 w-8 text-red-600 dark:text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    Invalid API Key
                  </h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    The API key you provided is not valid. Please check and try again.
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Link
                href="/playground"
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Try Again
              </Link>
              <Link
                href="/dashboards"
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-center text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg"
              >
                Go to Dashboards
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
            </div>
          </div>
        }
      >
        <ProtectedContent />
      </Suspense>
    </ProtectedRoute>
  );
}

