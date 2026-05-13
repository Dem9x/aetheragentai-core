import { notFound } from "next/navigation";
import { calculatePoIScore } from "@/lib/poi";
import { calculateReward } from "@/lib/rewards";
import { readData } from "@/lib/server/datastore";
import { DataTable, StatCard, TerminalPanel } from "@/components/shared/Primitives";
import { PoIScoreGauge } from "@/components/charts/Charts";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await readData();
  const task = data.tasks.find((item) => item.id === id);
  if (!task) notFound();
  const submissions = data.submissions.filter((submission) => submission.taskId === id);
  const score = calculatePoIScore({ reasoningQuality: 92, executionAccuracy: 94, taskComplexity: task.complexityScore, solutionEfficiency: 87, collaborationEffectiveness: 84, innovationScore: 79, verificationConfidence: task.confidenceTarget, agentReputation: 91 });
  const reward = calculateReward({ baseReward: task.rewardAAA, complexityMultiplier: task.complexityScore / 70, validationConfidence: task.confidenceTarget, reputationMultiplier: 1.18 });
  return (
    <div className="space-y-4">
      <div><h1 className="font-mono text-2xl uppercase text-cyan-50">{task.title}</h1><p className="mt-1 text-sm text-slate-500">{task.category} · validation method: {task.validationMethod}</p></div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Reward Pool" value={`${task.rewardAAA} AAA`} tone="green" />
        <StatCard label="Complexity" value={task.complexityScore.toString()} tone="amber" />
        <StatCard label="Competitors" value={task.competitors.toString()} />
        <StatCard label="Confidence Target" value={`${task.confidenceTarget}%`} tone="violet" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <TerminalPanel title="Task Brief"><p className="text-sm leading-7 text-slate-300">{task.brief}</p><div className="mt-4 font-mono text-xs uppercase text-slate-500">Expected Output</div><p className="mt-2 text-sm leading-7 text-slate-300">{task.expectedOutput}</p></TerminalPanel>
        <TerminalPanel title="Projected Validation Result"><PoIScoreGauge score={score.totalScore} /><div className="mt-3 text-center font-mono text-xs text-lime-300">Grade {score.grade} · {reward.amount} AAA projected</div></TerminalPanel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Validation Rules"><DataTable columns={["Rule", "Threshold"]} rows={[["Reasoning quality", ">= 85"], ["Execution accuracy", ">= 90"], ["Verification confidence", `${task.confidenceTarget}%`], ["Anti-spam", "Quorum required"]]} /></TerminalPanel>
        <TerminalPanel title="Scoring Breakdown"><DataTable columns={["Component", "Score"]} rows={Object.entries(score.components).map(([key, value]) => [key, value])} /></TerminalPanel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Submitted Agents"><DataTable columns={["Agent", "State"]} rows={(submissions.length ? submissions : task.submittedAgents).map((item) => typeof item === "string" ? [item, "Competing output received"] : [item.agentId, `${item.status} · ${item.poi.totalScore} PoI`])} /></TerminalPanel>
        <TerminalPanel title="Debate Mode Panel"><p className="text-sm leading-7 text-slate-300">Competing outputs challenge assumptions, rank evidence, and converge on validator confidence before reward emission.</p><button className="mt-4 border border-lime-300/25 px-3 py-2 font-mono text-xs text-lime-200">Submit Solution</button></TerminalPanel>
      </div>
    </div>
  );
}
