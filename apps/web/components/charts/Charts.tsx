"use client";

import dynamic from "next/dynamic";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TerminalPanel } from "@/components/shared/Primitives";

export function MiniLineChart({ data, color = "#18f0ff" }: { data: number[]; color?: string }) {
  const chartData = data.map((value, index) => ({ index, value }));
  return (
    <div className="h-20 min-h-20 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart data={chartData}>
          <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RewardChart() {
  const data = [
    { name: "Security", value: 8200 },
    { name: "Web3", value: 6900 },
    { name: "Reason", value: 5400 },
    { name: "Code", value: 4800 },
    { name: "Swarm", value: 6200 }
  ];
  return (
    <TerminalPanel title="Reward Distribution Chart">
      <div className="h-56 min-h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={{ background: "#05070a", border: "1px solid rgba(24,240,255,.25)", color: "#e6f6ff" }} />
            <Bar dataKey="value" fill="#18f0ff">
              {data.map((_, index) => <Cell key={index} fill={["#18f0ff", "#9b5cff", "#b7ff2a", "#ffbf3f", "#ff4d6d"][index]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </TerminalPanel>
  );
}

export function HeatmapGrid() {
  const cells = Array.from({ length: 48 }, (_, index) => 30 + ((index * 17) % 70));
  return (
    <TerminalPanel title="Task Complexity Heatmap">
      <div className="grid grid-cols-8 gap-1">
        {cells.map((value, index) => (
          <div
            key={index}
            title={`Complexity ${value}`}
            className="aspect-square border border-black/40"
            style={{ background: `rgba(${value > 75 ? "255,191,63" : "24,240,255"}, ${0.16 + value / 140})` }}
          />
        ))}
      </div>
    </TerminalPanel>
  );
}

export function PoIScoreGauge({ score }: { score: number }) {
  return (
    <div className="relative mx-auto grid h-32 w-32 place-items-center rounded-full border border-cyan-300/20 bg-black/30">
      <div className="absolute inset-2 rounded-full" style={{ background: `conic-gradient(#b7ff2a ${score * 3.6}deg, rgba(148,163,184,.12) 0)` }} />
      <div className="relative grid h-24 w-24 place-items-center rounded-full bg-[#05070a]">
        <div className="text-center font-mono">
          <div className="text-3xl font-semibold text-lime-300">{score}</div>
          <div className="text-[10px] uppercase text-slate-500">PoI</div>
        </div>
      </div>
    </div>
  );
}

export function ValidationConfidenceBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full bg-slate-800">
      <div className="h-full bg-lime-300 shadow-[0_0_12px_rgba(183,255,42,.4)]" style={{ width: `${value}%` }} />
    </div>
  );
}

export const ClientMiniLineChart = dynamic(() => Promise.resolve(MiniLineChart), { ssr: false });
export const ClientRewardChart = dynamic(() => Promise.resolve(RewardChart), { ssr: false });
