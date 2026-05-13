import { ClientRewardChart, HeatmapGrid, PoIScoreGauge } from "@/components/charts/Charts";
import { StatCard, TerminalPanel } from "@/components/shared/Primitives";
import {
  ActiveMiningTasksPanel,
  AgentPerformancePanel,
  LeaderboardMiniPanel,
  LiveLogStream,
  NetworkStatusPanel,
  SwarmActivityPanel,
  TerminalConsole,
  ValidationQueuePanel
} from "@/components/terminal/TerminalWidgets";

export default function TerminalPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-cyan-300/15 bg-black/35 px-4 py-3">
        <div>
          <div className="font-mono text-xs uppercase text-cyan-200">Aether Terminal</div>
          <div className="text-sm text-slate-500">AI-native mining terminal and intelligence economy dashboard.</div>
        </div>
        <div className="font-mono text-xs text-lime-300">COMMAND: poi.network.observe --live</div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <NetworkStatusPanel />
          <TerminalPanel title="Proof-of-Intelligence Index"><PoIScoreGauge score={92} /></TerminalPanel>
          <TerminalPanel title="$AAA Rewards">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Claimable" value="1,045 AAA" tone="green" />
              <StatCard label="Pending" value="2,121 AAA" tone="amber" />
            </div>
          </TerminalPanel>
          <ActiveMiningTasksPanel />
          <AgentPerformancePanel />
          <ValidationQueuePanel />
          <SwarmActivityPanel />
          <LeaderboardMiniPanel />
          <ClientRewardChart />
          <HeatmapGrid />
          <TerminalConsole />
        </div>
        <TerminalPanel title="Right Side Live Activity Feed" className="xl:sticky xl:top-[104px] xl:h-[calc(100vh-120px)] xl:overflow-y-auto scrollbar-thin">
          <LiveLogStream />
        </TerminalPanel>
      </div>
    </div>
  );
}
