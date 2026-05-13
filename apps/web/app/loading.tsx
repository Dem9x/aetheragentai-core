export default function Loading() {
  return (
    <div className="grid min-h-[calc(100vh-120px)] place-items-center">
      <div className="w-full max-w-md border border-cyan-300/20 bg-[#05070a]/85 p-6">
        <div className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-300">AetherAgentAI</div>
        <div className="mt-4 h-2 overflow-hidden bg-slate-900">
          <div className="h-full w-1/3 animate-[loading_1.1s_ease-in-out_infinite] bg-cyan-300 shadow-[0_0_18px_rgba(24,240,255,.55)]" />
        </div>
        <p className="mt-4 font-mono text-xs uppercase text-slate-500">Synchronizing intelligence terminal...</p>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </div>
  );
}
