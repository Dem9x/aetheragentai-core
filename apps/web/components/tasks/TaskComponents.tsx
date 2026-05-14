"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, Send, ShieldCheck, WalletCards, Zap } from "lucide-react";
import type { Agent, Task } from "@/types";
import { StatusPill } from "@/components/shared/Primitives";
import { apiRequest } from "@/lib/api/client";
import { formatInteger } from "@/lib/utils/format";
import { useAccount } from "wagmi";

export function TaskComplexityBadge({ value }: { value: number }) {
  return <StatusPill tone={value > 85 ? "red" : value > 72 ? "amber" : "cyan"}>CX {value}</StatusPill>;
}

export function RewardBadge({ value }: { value: number }) {
  return <span className="font-mono text-lime-300">{formatInteger(value)} AAA</span>;
}

function compactAddress(address?: string) {
  if (!address) return "off-chain";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function TaskCard({ task }: { task: Task }) {
  const [solved, setSolved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [assignedAgent, setAssignedAgent] = useState("");
  const [error, setError] = useState("");
  const { address } = useAccount();

  async function openAssign() {
    setAssignOpen(true);
    setError("");
    if (agents.length) return;
    try {
      const data = await apiRequest<{ agents: Agent[] }>("/api/agents");
      setAgents(data.agents);
      setSelectedAgentId(data.agents[0]?.id ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load agents");
    }
  }

  async function assignAgent() {
    if (!selectedAgentId) {
      setError("Create or select an agent first");
      return;
    }
    setAssigning(true);
    setError("");
    try {
      const data = await apiRequest<{ assigned: boolean; agent: Agent }>(`/api/tasks/${task.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ agentId: selectedAgentId })
      });
      setAssignedAgent(data.agent.name);
      setAssignOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Agent assignment failed");
    } finally {
      setAssigning(false);
    }
  }

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
          <div className="mt-1 text-xs text-slate-500">{task.category} - deadline {task.deadline}</div>
        </div>
        <TaskComplexityBadge value={task.complexityScore} />
      </div>

      <div className="mt-3 grid gap-2 border border-slate-800 bg-black/25 p-3 font-mono text-[10px] uppercase text-slate-500 md:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center gap-1 text-cyan-100">
            <WalletCards size={12} /> Created By
          </div>
          <div className="text-slate-300">{task.creatorName}</div>
          <div>{task.creatorType} - {compactAddress(task.creatorAddress)}</div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1 text-lime-100">
            <ShieldCheck size={12} /> Funding / Validation
          </div>
          <div className="text-slate-300">{task.rewardFundingStatus} - {task.settlementStatus}</div>
          <div>{task.validatorCount}/{task.requiredValidatorQuorum} validators - pass {task.passingScore}</div>
        </div>
      </div>

      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-300">{task.brief}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {task.requiredSkills.map((skill) => (
          <span className="border border-slate-700 bg-black/25 px-2 py-1 font-mono text-[10px] uppercase text-slate-400" key={skill}>{skill}</span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
        <Metric label="Reward" value={<RewardBadge value={task.rewardAAA} />} />
        <Metric label="Funding" value={task.rewardFundingStatus} />
        <Metric label="Validation" value={task.validationStatus} />
      </div>
      {assignedAgent ? <div className="mt-3 border border-cyan-300/20 bg-cyan-300/8 p-2 font-mono text-xs text-cyan-200"><CheckCircle2 className="mr-1 inline" size={14} />{assignedAgent} assigned to task queue.</div> : null}
      {solved ? <div className="mt-3 border border-lime-300/20 bg-lime-300/8 p-2 font-mono text-xs text-lime-200"><CheckCircle2 className="mr-1 inline" size={14} />Solution submitted to validation and persisted.</div> : null}
      {error ? <div className="mt-3 border border-rose-300/20 bg-rose-300/8 p-2 font-mono text-xs text-rose-200">{error}</div> : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={openAssign} className="border border-lime-300/20 px-3 py-2 font-mono text-xs text-lime-200 hover:bg-lime-300/8"><Send className="mr-1 inline" size={13} />Assign Agent</button>
        <Link href={`/tasks/${task.id}`} className="border border-cyan-300/20 px-3 py-2 text-center font-mono text-xs text-cyan-200 hover:bg-cyan-300/8"><Eye className="mr-1 inline" size={13} />Inspect</Link>
        <button disabled={saving} onClick={submitSolution} className="border border-violet-300/20 px-3 py-2 font-mono text-xs text-violet-200 hover:bg-violet-300/8 disabled:opacity-50"><Zap className="mr-1 inline" size={13} />{saving ? "Submitting" : "Submit Work"}</button>
        <Link href={`/tasks/${task.id}`} className="border border-amber-300/20 px-3 py-2 text-center font-mono text-xs text-amber-200 hover:bg-amber-300/8">Validation</Link>
      </div>
      {assignOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setAssignOpen(false)}>
          <div className="w-full max-w-lg border border-cyan-300/25 bg-[#05070a]" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-cyan-300/15 px-4 py-3 font-mono text-xs uppercase text-cyan-200">Assign Agent To Task</div>
            <div className="space-y-3 p-4">
              <div className="font-mono text-sm text-cyan-50">{task.title}</div>
              <p className="text-xs leading-5 text-slate-500">MVP assignment queues an agent for this task. The local runner still submits the final output separately.</p>
              {agents.length ? (
                <select className="w-full border border-cyan-300/20 bg-black/30 px-3 py-2 font-mono text-sm text-slate-100" value={selectedAgentId} onChange={(event) => setSelectedAgentId(event.target.value)}>
                  {agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.name} - {agent.type}</option>)}
                </select>
              ) : (
                <div className="border border-amber-300/20 bg-amber-300/8 p-3 text-sm text-amber-100">No agents found. Create an agent first.</div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setAssignOpen(false)} className="border border-slate-700 px-3 py-2 font-mono text-xs text-slate-300">Cancel</button>
                <button disabled={assigning || !agents.length} onClick={assignAgent} className="border border-lime-300/25 bg-lime-300/8 px-3 py-2 font-mono text-xs text-lime-200 disabled:opacity-50">{assigning ? "Assigning..." : "Assign Agent"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="border border-slate-800 bg-black/25 p-2"><div className="text-[10px] text-slate-500">{label}</div><div className="text-slate-100">{value}</div></div>;
}
