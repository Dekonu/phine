"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (status === "unauthenticated") {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Authentication Required
            </h1>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Please sign in to access this page.
            </p>
          </div>
        </div>
      )
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}

