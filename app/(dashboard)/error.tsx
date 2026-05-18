"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          An unexpected error occurred. You can try again or come back later.
          {error.digest && (
            <span className="block mt-1 text-xs text-gray-400 font-mono">
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <button
          onClick={unstable_retry}
          className="rounded-lg bg-[#1E6B4E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185c43] transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
