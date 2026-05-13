"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, Send, Zap } from "lucide-react";
import type { Task } from "@/types";
import { StatusPill } from "@/components/shared/Primitives";
import { apiRequest } from "@/lib/api/client";
import { useAccount } from "wagmi";

export function TaskComplexityBadge({ value }: { value: number }) {
  return <StatusPill tone={value > 85 ? "red" : value > 72 ? "amber" : "cyan"}>CX {value}</StatusPill>;
}

export function RewardBadge({ value }: { value: number }) {
  return <span className="font-mono text-lime-300">{value.toLocaleString()} AAA</span>;
}

export function TaskCard({ task }: { task: Task }) {
  const [solved, setSolved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { address } = useAccount();

  async function submitSolution() {
    setSaving(true);
    setError("");
    try {
      await apiRequest<{ accepted: boolean }>(`/api/tasks/${task.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          agentId: "agent-orion",
          walletAddress: address,
          solution: `Production submission for ${task.title}: validated task analysis queued for PoI verification.`
        })
      });
      setSolved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Task submission failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-cyan-300/18 bg-[#05070a]/85 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-cyan-100">{task.title}</div>
          <div className="mt-1 text-xs text-slate-500">{task.category} · deadline {task.deadline}</div>
        </div>
        <TaskComplexityBadge value={task.complexityScore} />
      </div>
      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-300">{task.brief}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {task.requiredSkills.map((skill) => <span className="border border-slate-700 bg-black/25 px-2 py-1 font-mono text-[10px] uppercase text-slate-400" key={skill}>{skill}</span>)}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
        <Metric label="Reward" value={<RewardBadge value={task.rewardAAA} />} />
        <Metric label="Competitors" value={task.competitors} />
        <Metric label="Target" value={`${task.confidenceTarget}%`} />
      </div>
      {solved ? <div className="mt-3 border border-lime-300/20 bg-lime-300/8 p-2 font-mono text-xs text-lime-200"><CheckCircle2 className="mr-1 inline" size={14} />Solution submitted to validation and persisted.</div> : null}
      {error ? <div className="mt-3 border border-rose-300/20 bg-rose-300/8 p-2 font-mono text-xs text-rose-200">{error}</div> : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="border border-lime-300/20 px-3 py-2 font-mono text-xs text-lime-200 hover:bg-lime-300/8"><Send className="mr-1 inline" size={13} />Assign Agent</button>
        <Link href={`/tasks/${task.id}`} className="border border-cyan-300/20 px-3 py-2 text-center font-mono text-xs text-cyan-200 hover:bg-cyan-300/8"><Eye className="mr-1 inline" size={13} />Inspect</Link>
        <button disabled={saving} onClick={submitSolution} className="border border-violet-300/20 px-3 py-2 font-mono text-xs text-violet-200 hover:bg-violet-300/8 disabled:opacity-50"><Zap className="mr-1 inline" size={13} />{saving ? "Submitting" : "Submit Work"}</button>
        <Link href={`/tasks/${task.id}`} className="border border-amber-300/20 px-3 py-2 text-center font-mono text-xs text-amber-200 hover:bg-amber-300/8">Validation</Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="border border-slate-800 bg-black/25 p-2"><div className="text-[10px] text-slate-500">{label}</div><div className="text-slate-100">{value}</div></div>;
}
