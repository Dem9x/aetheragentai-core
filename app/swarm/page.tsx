"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DataTable, StatCard, TerminalPanel } from "@/components/shared/Primitives";
import { swarms } from "@/lib/seed-data";

export default function SwarmPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><Header title="AI Swarm Mining" copy="Autonomous swarms coordinate roles, distribute tasks, and share $AAA reward pools." /><button onClick={() => setOpen(true)} className="flex items-center gap-2 border border-lime-300/25 px-3 py-2 font-mono text-xs text-lime-200"><Plus size={14} />Create Swarm</button></div>
      <div className="grid gap-2 md:grid-cols-4"><StatCard label="Active Swarms" value={swarms.length.toString()} /><StatCard label="Reward Pools" value={`${swarms.reduce((s, w) => s + w.rewardPool, 0).toLocaleString()} AAA`} tone="green" /><StatCard label="Avg Collaboration" value="90.5%" tone="violet" /><StatCard label="Agents Coordinating" value="6" tone="amber" /></div>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">{swarms.map((swarm) => <TerminalPanel title={swarm.name} key={swarm.id}><DataTable columns={["Composition", "Roles", "Collab", "Pool"]} rows={[[swarm.composition.join(", "), swarm.roles.join(", "), `${swarm.collaborationScore}%`, `${swarm.rewardPool} AAA`]]} /><div className="mt-3 grid grid-cols-4 gap-2">{Object.entries(swarm.taskDistribution).map(([k, v]) => <div className="border border-slate-800 bg-black/25 p-2 font-mono text-xs" key={k}><div className="text-slate-500">{k}</div><div className="text-cyan-200">{v}%</div></div>)}</div></TerminalPanel>)}</div>
        <TerminalPanel title="Network Graph Visualization"><SwarmGraph /><div className="mt-4 space-y-2">{swarms.flatMap((s) => s.logs).map((log) => <div className="border-l border-cyan-300/30 bg-black/25 p-2 font-mono text-xs text-slate-300" key={log}>{log}</div>)}</div></TerminalPanel>
      </div>
      {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="w-full max-w-md border border-cyan-300/25 bg-[#05070a] p-4"><div className="font-mono text-xs uppercase text-cyan-200">Create Swarm</div><input className="mt-4 w-full border border-cyan-300/20 bg-black/30 px-3 py-2 font-mono text-sm" defaultValue="Aether Swarm Sigma" /><button onClick={() => setOpen(false)} className="mt-4 border border-lime-300/25 px-3 py-2 font-mono text-xs text-lime-200">Create Swarm Draft</button></div></div> : null}
    </div>
  );
}

function SwarmGraph() {
  return <div className="relative h-72 border border-slate-800 bg-black/25">{["Architect", "Analyst", "Verifier", "Research", "Executor", "Judge"].map((node, index) => <div key={node} className="absolute grid h-20 w-20 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/8 text-center font-mono text-[10px] text-cyan-100" style={{ left: `${18 + (index % 3) * 28}%`, top: `${18 + Math.floor(index / 3) * 38}%` }}>{node}</div>)}</div>;
}

function Header({ title, copy }: { title: string; copy: string }) {
  return <div><h1 className="font-mono text-2xl uppercase text-cyan-50">{title}</h1><p className="mt-1 text-sm text-slate-500">{copy}</p></div>;
}
