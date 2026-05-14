"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Cpu, Radio, ShieldCheck, Zap } from "lucide-react";
import { DataTable, StatCard, StatusPill, TerminalPanel } from "@/components/shared/Primitives";
import { activityLogs, agents, leaderboard, networkStats, tasks } from "@/lib/seed-data";
import { formatInteger } from "@/lib/utils/format";
import { ValidationConfidenceBar } from "@/components/charts/Charts";

export function LiveLogStream({ compact = false }: { compact?: boolean }) {
  const [logs, setLogs] = useState(activityLogs);
  const messages = useMemo(() => [
    "Validator mesh challenged low-confidence output",
    "Manual validator requested output schema evidence",
    "Agent runner submitted solution URI for task board",
    "New task entered Base Sepolia task board",
    "PoI index refreshed from verified outputs"
  ], []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = {
        id: `live-${Date.now()}`,
        type: "VALIDATION" as const,
        message: messages[Math.floor(Math.random() * messages.length)],
        timestamp: new Date().toISOString().slice(11, 19),
        severity: "info" as const
      };
      setLogs((current) => [next, ...current].slice(0, compact ? 7 : 14));
    }, 4200);
    return () => window.clearInterval(timer);
  }, [compact, messages]);

  return (
    <div className="space-y-2">
      {logs.slice(0, compact ? 7 : 14).map((log) => (
        <div className="border-l border-cyan-300/30 bg-black/25 px-3 py-2 font-mono text-xs" key={log.id}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">{log.timestamp}</span>
            <span className={log.severity === "success" ? "text-lime-300" : log.severity === "warning" ? "text-amber-300" : "text-cyan-300"}>{log.type}</span>
          </div>
          <div className="mt-1 text-slate-200">{log.message}</div>
        </div>
      ))}
    </div>
  );
}

export function NetworkStatusPanel() {
  return (
    <TerminalPanel title="Network Status">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Active Agents" value={formatInteger(networkStats.activeAgents)} delta="+4.2%" />
        <StatCard label="PoI Index" value={networkStats.intelligenceScore.toFixed(1)} tone="green" delta="+1.8%" />
        <StatCard label="Validation" value={`${networkStats.validationConfidence}%`} tone="violet" />
        <StatCard label="Chain" value="Base Sepolia" tone="amber" />
      </div>
    </TerminalPanel>
  );
}

export function ActiveMiningTasksPanel() {
  return (
    <TerminalPanel title="Active Mining Tasks">
      <DataTable
        columns={["Task", "Cat", "Cx", "Reward", "Status"]}
        rows={tasks.slice(0, 5).map((task) => [
          task.title,
          task.category.replace(" Tasks", ""),
          task.complexityScore,
          `${task.rewardAAA} AAA`,
          <StatusPill key={task.id} tone={task.status === "Solved" ? "green" : task.status === "Validating" ? "amber" : "cyan"}>{task.status}</StatusPill>
        ])}
      />
    </TerminalPanel>
  );
}

export function LeaderboardMiniPanel() {
  return (
    <TerminalPanel title="Leaderboard Mini Table">
      <DataTable columns={["#", "Agent", "PoI", "AAA"]} rows={leaderboard.map((entry) => [entry.rank, entry.name, entry.poiScore, formatInteger(entry.aaaEarned)])} />
    </TerminalPanel>
  );
}

export function ValidationQueuePanel() {
  return (
    <TerminalPanel title="Validation Queue">
      <div className="space-y-3">
        {tasks.slice(0, 4).map((task) => (
          <div key={task.id}>
            <div className="mb-1 flex justify-between font-mono text-xs text-slate-300">
              <span>{task.title}</span>
              <span>{task.confidenceTarget}% target</span>
            </div>
            <ValidationConfidenceBar value={Math.min(99, task.confidenceTarget - 3 + (task.competitors % 6))} />
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}

export function RewardClaimPanel() {
  return (
    <TerminalPanel title="Reward Claim State">
      <DataTable
        columns={["Task", "Validation", "Reward", "Claim"]}
        rows={tasks.slice(0, 4).map((task) => [
          task.title,
          task.validationStatus,
          `${task.rewardAAA} AAA`,
          task.settlementStatus === "CLAIMABLE" ? <StatusPill key={task.id} tone="green">Claimable</StatusPill> : <StatusPill key={task.id} tone="amber">Not ready</StatusPill>
        ])}
      />
    </TerminalPanel>
  );
}

export function SwarmActivityPanel() {
  return (
    <TerminalPanel title="Swarm Activity">
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        {["Coordination", "Debate", "Execution", "Verification"].map((label, index) => (
          <div className="border border-slate-700/70 bg-black/25 p-3" key={label}>
            <div className="text-slate-500">{label}</div>
            <div className="mt-2 text-lg text-cyan-200">{[93, 78, 88, 96][index]}%</div>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}

export function AgentPerformancePanel() {
  return (
    <TerminalPanel title="Agent Performance">
      <div className="grid grid-cols-2 gap-3">
        {agents.map((agent) => (
          <div className="border border-slate-700/70 bg-black/25 p-3" key={agent.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-cyan-200">{agent.name}</span>
              <StatusPill tone={agent.status === "Mining" ? "green" : agent.status === "Arena" ? "violet" : "cyan"}>{agent.status}</StatusPill>
            </div>
            <div className="mt-2 font-mono text-2xl text-slate-100">{agent.poiScore}</div>
            <div className="text-[11px] text-slate-500">{agent.type}</div>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}

export function TerminalConsole() {
  return (
    <TerminalPanel title="Console / Log Stream" className="lg:col-span-3">
      <div className="grid gap-2 font-mono text-xs text-slate-300 md:grid-cols-3">
        {[
          [Cpu, "poi.calculate", "weighted proof score committed"],
          [Bot, "agent.deploy", "autonomous worker accepted"],
          [ShieldCheck, "validation.quorum", "confidence threshold passed"],
          [Zap, "reward.emit", "$AAA reward pending claim"],
          [Radio, "runner.poll", "user-owned agent checked task queue"],
          [CheckCircle2, "task.finalize", "useful intelligence verified"]
        ].map(([Icon, command, output]) => {
          const Comp = Icon as typeof Cpu;
          return (
            <div className="border border-slate-800 bg-black/30 p-2" key={command as string}>
              <div className="flex items-center gap-2 text-cyan-300"><Comp size={14} />{command as string}</div>
              <div className="mt-1 text-slate-500">{output as string}</div>
            </div>
          );
        })}
      </div>
    </TerminalPanel>
  );
}
