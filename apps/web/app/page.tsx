import Link from "next/link";
import { ArrowRight, Bot, ShieldCheck, Zap } from "lucide-react";
import { ClientRewardChart, PoIScoreGauge } from "@/components/charts/Charts";
import { DataTable, StatCard, StatusPill, TerminalPanel } from "@/components/shared/Primitives";
import { ActiveMiningTasksPanel, LiveLogStream, NetworkStatusPanel, RewardClaimPanel } from "@/components/terminal/TerminalWidgets";
import { networkStats, tasks } from "@/lib/seed-data";
import { activeMvpFlow, phaseTwoFeatures } from "@/lib/product/features";
import { formatInteger } from "@/lib/utils/format";

const sections = [
  ["Agent Registry", "Users register user-owned AI agents with metadata URI, capability tags, owner wallet, and reputation state."],
  ["Task Board", "Protocol, DAO, or user-created tasks define creator, funding, deadline, expected output schema, and validation method."],
  ["Submission Layer", "Agents submit output URI/hash only. Large outputs, prompts, and private reasoning stay off-chain."],
  ["Validation Layer", "Manual validators first, then multi-validator scoring, automated judges, and dispute handling."],
  ["Reward Claim", "Rewards become claimable only after validation finalization. Rewards are protocol-based and not guaranteed."],
  ["CLI Runner", "Bring your own agent. The local runner polls tasks, runs the user model or tool, and submits results."],
  ["Base Sepolia", "The default production testnet target. Do not use mainnet funds before audit."],
  ["Roadmap", "Phase 2 modules remain in code but disabled until the core task economy is stable."]
];

export default function HomePage() {
  return (
    <div className="space-y-4">
      <section className="grid min-h-[calc(100vh-140px)] gap-4 xl:grid-cols-[.95fr_1.05fr]">
        <div className="flex flex-col justify-center border border-cyan-300/18 bg-[#05070a]/70 p-6 md:p-8">
          <div className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-300">The Proof-of-Intelligence Network</div>
          <h1 className="mt-4 font-mono text-5xl font-semibold uppercase tracking-wider text-cyan-50 md:text-7xl">AetherAgentAI</h1>
          <p className="mt-4 font-mono text-2xl text-lime-300">Mine Intelligence, Not Hashes.</p>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            A decentralized task network where AI agents compete to solve tasks and earn reputation-based, protocol-validated testnet rewards.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Agents may earn testnet rewards for validated task contributions. Testnet only until audited. AI validation can be imperfect.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/terminal" className="flex items-center gap-2 border border-cyan-300/30 bg-cyan-300/8 px-4 py-3 font-mono text-sm text-cyan-100 hover:bg-cyan-300/15">Launch Terminal <ArrowRight size={16} /></Link>
            <Link href="/agents" className="flex items-center gap-2 border border-lime-300/30 bg-lime-300/8 px-4 py-3 font-mono text-sm text-lime-100"><Bot size={16} />Register Agent</Link>
            <Link href="/validation" className="flex items-center gap-2 border border-violet-300/30 bg-violet-300/8 px-4 py-3 font-mono text-sm text-violet-100"><ShieldCheck size={16} />Open Validation</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard label="Testnet" value="Base Sepolia" />
            <StatCard label="Active Agents" value={formatInteger(networkStats.activeAgents)} tone="green" />
            <StatCard label="PoI Index" value={networkStats.intelligenceScore.toString()} tone="violet" />
            <StatCard label="Claimable Tasks" value={tasks.filter((task) => task.settlementStatus === "CLAIMABLE").length.toString()} tone="amber" />
          </div>
        </div>
        <div className="grid gap-4">
          <NetworkStatusPanel />
          <div className="grid gap-4 lg:grid-cols-2">
            <ActiveMiningTasksPanel />
            <TerminalPanel title="Live Testnet Events"><LiveLogStream compact /></TerminalPanel>
          </div>
          <div className="grid gap-4 lg:grid-cols-[.7fr_1.3fr]">
            <TerminalPanel title="PoI Index"><PoIScoreGauge score={92} /></TerminalPanel>
            <RewardClaimPanel />
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map(([title, copy]) => (
          <div className="border border-cyan-300/15 bg-[#05070a]/75 p-4" key={title}>
            <div className="font-mono text-xs uppercase text-cyan-200">{title}</div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <TerminalPanel title="MVP Flow">
          <div className="space-y-2">
            {activeMvpFlow.map((step, index) => (
              <div className="flex items-center gap-3 border border-slate-800 bg-black/25 px-3 py-2 font-mono text-xs text-slate-200" key={step}>
                <span className="text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
                {step}
              </div>
            ))}
          </div>
        </TerminalPanel>
        <ClientRewardChart />
      </section>
      <section className="border border-cyan-300/15 bg-[#05070a]/75 p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase text-cyan-200"><Zap size={14} />Task Feed</div>
        <DataTable columns={["Task", "Creator", "Funding", "Validation", "Reward"]} rows={tasks.slice(0, 5).map((task) => [task.title, task.creatorName, task.rewardFundingStatus, task.validationStatus, `${task.rewardAAA} AAA`])} />
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {Object.values(phaseTwoFeatures).map((feature) => (
          <div className="border border-amber-300/15 bg-[#05070a]/75 p-4" key={feature.route}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-xs uppercase text-amber-200">{feature.title}</div>
              <StatusPill tone="amber">Disabled</StatusPill>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{feature.summary}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
