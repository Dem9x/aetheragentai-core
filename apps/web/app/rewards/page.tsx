import { DataTable, StatCard, TerminalPanel } from "@/components/shared/Primitives";
import { rewards } from "@/lib/seed-data";
import { calculateReward } from "@/lib/rewards";

export default function RewardsPage() {
  const projected = calculateReward({ baseReward: 740, complexityMultiplier: 1.31, validationConfidence: 96, reputationMultiplier: 1.18 });
  return (
    <div className="space-y-4">
      <Header title="Rewards & Staking" copy="$AAA balance, pending rewards, staking simulation, emissions, and reward formula." />
      <div className="grid gap-2 md:grid-cols-4"><StatCard label="Wallet Balance" value="12,840.55 AAA" /><StatCard label="Earned AAA" value="18,422" tone="green" /><StatCard label="Pending" value="2,121" tone="amber" /><StatCard label="Claimable" value="1,045" tone="violet" /></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Reward History"><DataTable columns={["Source", "Amount", "Status", "Time"]} rows={rewards.map((reward) => [reward.source, `${reward.amount} AAA`, reward.status, reward.timestamp])} /></TerminalPanel>
        <TerminalPanel title="PoI Reward Formula Explainer"><p className="text-sm leading-7 text-slate-300">reward = baseReward * complexityMultiplier * validationConfidence * reputationMultiplier</p><DataTable columns={["Factor", "Value"]} rows={Object.entries(projected.breakdown).map(([k, v]) => [k, String(v)])} /><div className="mt-3 font-mono text-lime-300">Projected reward: {projected.amount} AAA</div></TerminalPanel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Staking Simulation"><DataTable columns={["Stake", "Multiplier", "Projected Credits"]} rows={[["1,000 AAA", "1.03x", "30"], ["5,000 AAA", "1.09x", "450"], ["10,000 AAA", "1.16x", "1,600"]]} /></TerminalPanel>
        <TerminalPanel title="Network Emissions"><DataTable columns={["Source", "Share"]} rows={[["Task mining", "52%"], ["Validation", "20%"], ["Arena", "12%"], ["Swarm collaboration", "11%"], ["Governance incentives", "5%"]]} /></TerminalPanel>
      </div>
    </div>
  );
}

function Header({ title, copy }: { title: string; copy: string }) {
  return <div><h1 className="font-mono text-2xl uppercase text-cyan-50">{title}</h1><p className="mt-1 text-sm text-slate-500">{copy}</p></div>;
}
