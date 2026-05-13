"use client";

import { useEffect, useMemo, useState } from "react";
import type { Agent, AgentType } from "@/types";
import { AgentCard, CreateAgentModal } from "@/components/agents/AgentComponents";
import { SearchBox, StatCard } from "@/components/shared/Primitives";
import { agents as baseAgents } from "@/lib/seed-data";
import { apiRequest } from "@/lib/api/client";
import { formatInteger } from "@/lib/utils/format";

const filters: ("All" | AgentType)[] = ["All", "Coding Agent", "Research Agent", "Blockchain Analysis Agent", "Trading Agent", "Security Agent", "Mathematical Reasoning Agent", "Optimization Agent", "Multi-Modal Agent", "Autonomous Web3 Agent"];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(baseAgents);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const visible = useMemo(() => agents.filter((agent) => (filter === "All" || agent.type === filter) && agent.name.toLowerCase().includes(query.toLowerCase())), [agents, filter, query]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ agents: Agent[] }>("/api/agents")
      .then((data) => {
        if (!cancelled) setAgents(data.agents);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load agents");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Agent Management" copy="Register user-owned AI agents, connect hosted or local runtimes, and route verified task work into Aether." />
      <div className="grid gap-2 md:grid-cols-4">
        <StatCard label="User Agents" value={agents.length.toString()} />
        <StatCard label="Total Rewards" value={`${formatInteger(agents.reduce((sum, agent) => sum + agent.totalRewards, 0))} AAA`} tone="green" />
        <StatCard label="Avg Reputation" value={Math.round(agents.reduce((sum, agent) => sum + agent.reputation, 0) / agents.length).toString()} tone="violet" />
        <StatCard label="Solved Tasks" value={formatInteger(agents.reduce((sum, agent) => sum + agent.solvedTasks, 0))} tone="amber" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search agents" />
        <CreateAgentModal onCreate={(agent) => setAgents([agent, ...agents])} />
      </div>
      {loading ? <div className="border border-cyan-300/15 p-4 font-mono text-xs text-cyan-200">Loading persisted agents...</div> : null}
      {error ? <div className="border border-rose-300/20 bg-rose-300/8 p-4 font-mono text-xs text-rose-200">{error}</div> : null}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 border px-3 py-2 font-mono text-xs ${filter === item ? "border-cyan-300/30 bg-cyan-300/8 text-cyan-100" : "border-slate-800 text-slate-500"}`}>{item}</button>)}
      </div>
      {visible.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((agent) => <AgentCard agent={agent} key={agent.id} />)}</div> : <div className="border border-slate-800 p-8 text-center text-slate-500">No agents match this filter.</div>}
    </div>
  );
}

function PageHeader({ title, copy }: { title: string; copy: string }) {
  return <div><h1 className="font-mono text-2xl uppercase text-cyan-50">{title}</h1><p className="mt-1 text-sm text-slate-500">{copy}</p></div>;
}
