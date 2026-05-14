"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Pause, Play, Plus, Send } from "lucide-react";
import type { Agent } from "@/types";
import { apiRequest } from "@/lib/api/client";
import { formatInteger } from "@/lib/utils/format";
import { ClientMiniLineChart, ValidationConfidenceBar } from "@/components/charts/Charts";
import { StatusPill } from "@/components/shared/Primitives";
import { useAccount } from "wagmi";

export function AgentStatusBadge({ status }: { status: Agent["status"] }) {
  return <StatusPill tone={status === "Mining" ? "green" : status === "Paused" ? "red" : status === "Arena" ? "violet" : "cyan"}>{status}</StatusPill>;
}

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="border border-cyan-300/18 bg-[#05070a]/85 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-cyan-100"><Bot size={16} />{agent.name}</div>
          <div className="mt-1 text-xs text-slate-500">{agent.type}</div>
        </div>
        <AgentStatusBadge status={agent.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill tone={agent.integration ? "green" : "amber"}>{agent.integration?.runtimeType ?? "No Runtime"}</StatusPill>
        <StatusPill tone={agent.integration?.status === "ACTIVE" ? "green" : agent.integration ? "amber" : "red"}>{agent.integration?.status ?? "Unconfigured"}</StatusPill>
      </div>
      <ClientMiniLineChart data={agent.trend} color="#b7ff2a" />
      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
        <Metric label="XP" value={formatInteger(agent.xp)} />
        <Metric label="REP" value={agent.reputation} />
        <Metric label="AAA" value={formatInteger(agent.totalRewards)} />
        <Metric label="SOLVED" value={agent.solvedTasks} />
        <Metric label="WIN" value={`${agent.winRate}%`} />
        <Metric label="VAL" value={`${agent.validationScore}%`} />
      </div>
      <div className="mt-3">
        <ValidationConfidenceBar value={agent.validationScore} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href={`/agents/${agent.id}`} className="border border-cyan-300/20 px-3 py-2 text-center font-mono text-xs text-cyan-200 hover:bg-cyan-300/8">Open Profile</Link>
        <button className="border border-lime-300/20 px-3 py-2 font-mono text-xs text-lime-200 hover:bg-lime-300/8"><Send className="mr-1 inline" size={13} />Assign</button>
        <Link href={`/agents/${agent.id}`} className="border border-violet-300/20 px-3 py-2 text-center font-mono text-xs text-violet-200 hover:bg-violet-300/8"><Play className="mr-1 inline" size={13} />Runtime</Link>
        <button className="border border-amber-300/20 px-3 py-2 font-mono text-xs text-amber-200 hover:bg-amber-300/8"><Pause className="mr-1 inline" size={13} />Pause</button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="border border-slate-800 bg-black/25 p-2"><div className="text-[10px] text-slate-500">{label}</div><div className="text-slate-100">{value}</div></div>;
}

export function CreateAgentModal({ onCreate }: { onCreate: (agent: Agent) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("AAA-SENTINEL");
  const [type, setType] = useState("Autonomous Web3 Agent");
  const [promptProfile, setPromptProfile] = useState("Production registered agent awaiting orchestrator assignment.");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { address, isConnected } = useAccount();

  async function deployAgent() {
    setSaving(true);
    setError("");
    try {
      if (!isConnected || !address) throw new Error("Connect wallet and sign in before registering a real agent.");
      const data = await apiRequest<{ agent: Agent }>("/api/agents", {
        method: "POST",
        body: JSON.stringify({
          name,
          type,
          promptProfile,
          ownerAddress: address
        })
      });
      onCreate(data.agent);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Agent deployment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-2 border border-lime-300/25 bg-lime-300/8 px-3 font-mono text-xs text-lime-200"><Plus size={14} />Create Agent</button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg border border-cyan-300/25 bg-[#05070a]">
            <div className="border-b border-cyan-300/15 px-4 py-3 font-mono text-xs uppercase text-cyan-200">Deploy New Intelligence Miner</div>
            <div className="space-y-3 p-4">
              <input className="w-full border border-cyan-300/20 bg-black/30 px-3 py-2 font-mono text-sm" value={name} onChange={(event) => setName(event.target.value)} />
              <select className="w-full border border-cyan-300/20 bg-black/30 px-3 py-2 font-mono text-sm" value={type} onChange={(event) => setType(event.target.value)}>
                <option>Coding Agent</option><option>Research Agent</option><option>Blockchain Analysis Agent</option><option>Security Agent</option>
                <option>Autonomous Web3 Agent</option>
              </select>
              <textarea className="h-28 w-full border border-cyan-300/20 bg-black/30 px-3 py-2 font-mono text-sm" value={promptProfile} onChange={(event) => setPromptProfile(event.target.value)} />
              {error ? <div className="border border-rose-300/25 bg-rose-300/8 p-2 font-mono text-xs text-rose-200">{error}</div> : null}
              <div className="flex justify-end gap-2">
                <button onClick={() => setOpen(false)} className="border border-slate-700 px-3 py-2 font-mono text-xs text-slate-300">Cancel</button>
                <button disabled={saving} onClick={deployAgent} className="border border-lime-300/25 bg-lime-300/8 px-3 py-2 font-mono text-xs text-lime-200 disabled:opacity-50">{saving ? "Registering..." : "Register Agent"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
