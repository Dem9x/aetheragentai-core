import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientMiniLineChart, PoIScoreGauge, ValidationConfidenceBar } from "@/components/charts/Charts";
import { DataTable, StatCard, TerminalPanel } from "@/components/shared/Primitives";
import { AgentIntegrationPanel } from "@/components/agents/AgentIntegrationPanel";
import { getAgent } from "@/lib/server/core-data";
import { formatInteger } from "@/lib/utils/format";

export default async function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgent(id).catch(() => null);
  if (!agent) notFound();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl uppercase text-cyan-50">{agent.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{agent.type} · {agent.model}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/arena" className="border border-violet-300/25 px-3 py-2 font-mono text-xs text-violet-200">Send to Arena</Link>
          <Link href="/tasks" className="border border-lime-300/25 px-3 py-2 font-mono text-xs text-lime-200">Assign Mining Task</Link>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <TerminalPanel title="Identity">
          <PoIScoreGauge score={agent.poiScore} />
          <p className="mt-4 text-sm leading-6 text-slate-300">{agent.promptProfile}</p>
        </TerminalPanel>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="XP" value={formatInteger(agent.xp)} />
          <StatCard label="Reputation" value={agent.reputation.toString()} tone="violet" />
          <StatCard label="Rewards" value={`${formatInteger(agent.totalRewards)} AAA`} tone="green" />
          <StatCard label="Evolution" value={`LVL ${agent.evolutionLevel}`} tone="amber" />
        </div>
      </div>
      <AgentIntegrationPanel agentId={agent.id} initial={agent.integration} />
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Reputation Graph"><ClientMiniLineChart data={agent.trend} color="#18f0ff" /></TerminalPanel>
        <TerminalPanel title="Skill Matrix">
          <div className="space-y-3">{Object.entries(agent.skills).map(([skill, value]) => <div key={skill}><div className="mb-1 flex justify-between font-mono text-xs"><span>{skill}</span><span>{value}%</span></div><ValidationConfidenceBar value={value} /></div>)}</div>
        </TerminalPanel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Task History"><DataTable columns={["Task", "Score", "Reward", "Date"]} rows={agent.history.map((item) => [item.task, item.score, `${item.reward} AAA`, item.date])} /></TerminalPanel>
        <TerminalPanel title="Unlockable Modules"><div className="grid gap-2">{agent.unlockableModules.map((item) => <div className="border border-slate-800 bg-black/25 p-3 font-mono text-xs text-slate-300" key={item}>{item}</div>)}</div></TerminalPanel>
      </div>
      <TerminalPanel title="Recent Outputs"><div className="grid gap-2 md:grid-cols-3">{agent.recentOutputs.map((item) => <div className="border border-slate-800 bg-black/25 p-3 text-sm text-slate-300" key={item}>{item}</div>)}</div></TerminalPanel>
    </div>
  );
}
