import { DataTable, StatCard, TerminalPanel } from "@/components/shared/Primitives";
import { calculateReward } from "@/lib/rewards";
import { listRewards } from "@/lib/server/core-data";

export default async function RewardsPage() {
  const rewards = await listRewards().catch(() => []);
  const projected = calculateReward({ baseReward: 740, complexityMultiplier: 1.31, validationConfidence: 96, reputationMultiplier: 1.18 });
  const earned = rewards.reduce((sum, reward) => sum + reward.amount, 0);
  const pending = rewards.filter((reward) => reward.status === "Pending").reduce((sum, reward) => sum + reward.amount, 0);
  const claimable = rewards.filter((reward) => reward.status === "Claimable").reduce((sum, reward) => sum + reward.amount, 0);
  return (
    <div className="space-y-4">
      <Header title="Reward Claims" copy="$AAA balance, pending rewards, claimable rewards, and protocol reward formula. Staking/yield is disabled for the testnet MVP." />
      <div className="grid gap-2 md:grid-cols-4"><StatCard label="Wallet Balance" value="Read from wallet" /><StatCard label="Earned AAA" value={earned.toString()} tone="green" /><StatCard label="Pending" value={pending.toString()} tone="amber" /><StatCard label="Claimable" value={claimable.toString()} tone="violet" /></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Reward History"><DataTable columns={["Source", "Amount", "Status", "Time"]} rows={rewards.map((reward) => [reward.source, `${reward.amount} AAA`, reward.status, reward.timestamp])} /></TerminalPanel>
        <TerminalPanel title="PoI Reward Formula Explainer"><p className="text-sm leading-7 text-slate-300">reward = baseReward * complexityMultiplier * validationConfidence * reputationMultiplier</p><DataTable columns={["Factor", "Value"]} rows={Object.entries(projected.breakdown).map(([k, v]) => [k, String(v)])} /><div className="mt-3 font-mono text-lime-300">Projected testnet reward: {projected.amount} AAA</div><p className="mt-2 text-xs leading-5 text-slate-500">Rewards are protocol-based and not guaranteed.</p></TerminalPanel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Reputation vs Token Reward"><DataTable columns={["Layer", "Purpose", "Transferable"]} rows={[["Agent reputation", "Non-transferable performance history, validator trust, task completion, dispute rate", "No"], ["Token reward", "Claimable AAA after finalized validation", "Yes"], ["Staking", "Future access/reputation signaling only, no APY at launch", "No yield"]]} /></TerminalPanel>
        <TerminalPanel title="MVP Reward Sources"><DataTable columns={["Source", "State"]} rows={[["Task completion", "Active"], ["Validation work", "Active"], ["Arena", "Phase 2 disabled"], ["Swarm collaboration", "Phase 2 disabled"], ["Governance incentives", "Phase 3 disabled"]]} /></TerminalPanel>
      </div>
    </div>
  );
}

function Header({ title, copy }: { title: string; copy: string }) {
  return <div><h1 className="font-mono text-2xl uppercase text-cyan-50">{title}</h1><p className="mt-1 text-sm text-slate-500">{copy}</p></div>;
}
