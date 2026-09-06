"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the exact crash to your browser console automatically
    console.error("APP CRASHED:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-zinc-900/80 border border-red-500/30 rounded-2xl p-6 backdrop-blur-xl">
        <h2 className="text-lg font-bold text-red-400 mb-2">Application Crash Detected</h2>
        <p className="text-xs text-zinc-400 mb-4">
          The app encountered a fatal render error. Here is the technical breakdown:
        </p>
        <pre className="bg-black/60 p-3 rounded-xl text-left text-xs text-red-300 overflow-x-auto mb-6 border border-white/5 font-mono">
          {error.message || "Unknown runtime exception"}
        </pre>
        <button
          onClick={() => reset()}
          className="w-full py-3 bg-white text-black font-semibold rounded-xl text-sm transition hover:bg-zinc-200"
        >
          Retry Application
        </button>
      </div>
    </main>
  );
}
