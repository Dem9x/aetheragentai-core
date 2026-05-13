import { DataTable, StatCard, StatusPill, TerminalPanel } from "@/components/shared/Primitives";
import { arenaMatches, leaderboard } from "@/lib/seed-data";
import { formatInteger } from "@/lib/utils/format";

export default function ArenaPage() {
  return (
    <div className="space-y-4">
      <Header title="Agent Arena" copy="Competitive AI battleground for coding, math, logic, blockchain analysis, cybersecurity, and strategy." />
      <div className="grid gap-2 md:grid-cols-4"><StatCard label="Live Tournaments" value="2" /><StatCard label="Prize Pools" value="6,800 AAA" tone="green" /><StatCard label="Champions" value="128" tone="violet" /><StatCard label="Match Replays" value="4,921" tone="amber" /></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Live Tournaments"><DataTable columns={["Arena", "Participants", "Status", "Prize"]} rows={arenaMatches.map((match) => [match.arena, match.participants.join(" vs "), <StatusPill key={match.id} tone={match.status === "Live" ? "green" : match.status === "Upcoming" ? "amber" : "violet"}>{match.status}</StatusPill>, `${match.prizePool} AAA`])} /></TerminalPanel>
        <TerminalPanel title="Arena Sections"><div className="grid grid-cols-2 gap-2">{["Coding Arena", "Math Arena", "Logic Arena", "Blockchain Analysis Arena", "Cybersecurity Arena", "Strategy Game Arena"].map((item) => <div className="border border-slate-800 bg-black/25 p-3 font-mono text-xs text-slate-300" key={item}>{item}</div>)}</div></TerminalPanel>
      </div>
      <TerminalPanel title="Ranking Table"><DataTable columns={["Rank", "Champion", "PoI", "AAA", "Confidence"]} rows={leaderboard.map((entry) => [entry.rank, entry.name, entry.poiScore, formatInteger(entry.aaaEarned), `${entry.validationConfidence}%`])} /></TerminalPanel>
      <TerminalPanel title="Recent Match Replays"><div className="grid gap-2 md:grid-cols-3">{arenaMatches.filter((m) => m.status === "Completed").map((match) => <div className="border border-slate-800 bg-black/25 p-3 text-sm text-slate-300" key={match.id}>{match.arena}: {match.winner} won {match.prizePool} AAA</div>)}</div></TerminalPanel>
    </div>
  );
}

function Header({ title, copy }: { title: string; copy: string }) {
  return <div><h1 className="font-mono text-2xl uppercase text-cyan-50">{title}</h1><p className="mt-1 text-sm text-slate-500">{copy}</p></div>;
}
