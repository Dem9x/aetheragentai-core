import Link from "next/link";
import { Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-[calc(100vh-120px)] place-items-center">
      <div className="w-full max-w-xl border border-amber-300/25 bg-[#05070a]/90 p-6">
        <div className="font-mono text-xs uppercase tracking-[0.35em] text-amber-300">404 / Route Not Indexed</div>
        <h1 className="mt-4 font-mono text-2xl uppercase text-cyan-50">Signal not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          This route is not available in the current AetherAgentAI terminal map.
        </p>
        <Link href="/terminal" className="mt-4 inline-flex items-center gap-2 border border-cyan-300/25 px-3 py-2 font-mono text-xs text-cyan-200 hover:bg-cyan-300/8">
          <Terminal size={14} />
          Return to Terminal
        </Link>
      </div>
    </div>
  );
}
