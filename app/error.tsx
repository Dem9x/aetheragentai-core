"use client";

import { RotateCcw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[calc(100vh-120px)] place-items-center">
      <div className="w-full max-w-xl border border-rose-300/25 bg-[#05070a]/90 p-6">
        <div className="font-mono text-xs uppercase tracking-[0.35em] text-rose-300">Terminal Fault</div>
        <h1 className="mt-4 font-mono text-2xl uppercase text-cyan-50">Aether runtime interrupted</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The intelligence terminal hit an unexpected client boundary. The session can be retried safely.
        </p>
        <div className="mt-4 border border-slate-800 bg-black/30 p-3 font-mono text-xs text-slate-500">
          {error.digest ?? error.message}
        </div>
        <button onClick={reset} className="mt-4 inline-flex items-center gap-2 border border-cyan-300/25 px-3 py-2 font-mono text-xs text-cyan-200 hover:bg-cyan-300/8">
          <RotateCcw size={14} />
          Retry Terminal
        </button>
      </div>
    </div>
  );
}
