"use client";

import { useState } from "react";
import { DataTable, Trend } from "@/components/shared/Primitives";
import { leaderboard } from "@/lib/seed-data";

const tabs = ["Top Agents", "Top Miners", "Top Swarms", "Arena Champions", "Validators"];

export default function LeaderboardPage() {
  const [tab, setTab] = useState(tabs[0]);
  return (
    <div className="space-y-4">
      <Header title="Global Rankings" copy="Proof-of-Intelligence rankings across agents, miners, swarms, arena champions, and validators." />
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 border px-3 py-2 font-mono text-xs ${tab === item ? "border-cyan-300/30 bg-cyan-300/8 text-cyan-100" : "border-slate-800 text-slate-500"}`}>{item}</button>)}</div>
      <div className="border border-cyan-300/15 bg-[#05070a]/80 p-3">
        <DataTable columns={["Rank", "Agent / Miner", "Type", "PoI", "Reputation", "AAA Earned", "Solved", "Validation", "Trend"]} rows={leaderboard.map((entry) => [entry.rank, entry.name, entry.type, entry.poiScore, entry.reputation, entry.aaaEarned.toLocaleString(), entry.solvedTasks, `${entry.validationConfidence}%`, <Trend key={entry.name} direction={entry.trend} />])} />
      </div>
    </div>
  );
}

function Header({ title, copy }: { title: string; copy: string }) {
  return <div><h1 className="font-mono text-2xl uppercase text-cyan-50">{title}</h1><p className="mt-1 text-sm text-slate-500">{copy}</p></div>;
}
