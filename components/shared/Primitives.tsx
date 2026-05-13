"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowDownRight, ArrowUpRight, Circle, Search, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { formatEther } from "viem";
import { useAccount, useBalance, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { cn } from "@/lib/utils/cn";
import { defaultChain } from "@/lib/web3/chains";
import { formatAddress } from "@/lib/wallet";

export function TerminalPanel({
  title,
  action,
  children,
  className
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("border border-cyan-300/20 bg-[#05070a]/88 shadow-[0_0_35px_rgba(24,240,255,0.05)]", className)}
    >
      <div className="flex h-9 items-center justify-between border-b border-cyan-300/15 px-3">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-cyan-200">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_var(--cyan)]" />
          {title}
        </div>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </motion.section>
  );
}

export function StatCard({
  label,
  value,
  delta,
  tone = "cyan"
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "cyan" | "green" | "amber" | "red" | "violet";
}) {
  const tones = {
    cyan: "text-cyan-300",
    green: "text-lime-300",
    amber: "text-amber-300",
    red: "text-rose-300",
    violet: "text-violet-300"
  };
  return (
    <div className="border border-slate-700/70 bg-[#080b10]/70 p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn("mt-2 font-mono text-xl font-semibold", tones[tone])}>{value}</div>
      {delta ? <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-lime-300"><ArrowUpRight size={12} />{delta}</div> : null}
    </div>
  );
}

export function DataTable({
  columns,
  rows
}: {
  columns: string[];
  rows: (string | number | ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[620px] border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b border-cyan-300/15 text-left text-[10px] uppercase text-slate-500">
            {columns.map((column) => <th className="px-2 py-2 font-medium" key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className="border-b border-slate-800/80 hover:bg-cyan-300/5" key={index}>
              {row.map((cell, cellIndex) => <td className="px-2 py-2 text-slate-200" key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusPill({ children, tone = "cyan" }: { children: ReactNode; tone?: "cyan" | "green" | "amber" | "red" | "violet" }) {
  const tones = {
    cyan: "border-cyan-300/30 text-cyan-200 bg-cyan-300/8",
    green: "border-lime-300/30 text-lime-200 bg-lime-300/8",
    amber: "border-amber-300/30 text-amber-200 bg-amber-300/8",
    red: "border-rose-300/30 text-rose-200 bg-rose-300/8",
    violet: "border-violet-300/30 text-violet-200 bg-violet-300/8"
  };
  return <span className={cn("inline-flex items-center gap-1 border px-2 py-1 font-mono text-[10px] uppercase", tones[tone])}><Circle size={7} fill="currentColor" />{children}</span>;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="flex h-9 min-w-0 items-center gap-2 border border-cyan-300/20 bg-black/30 px-3 font-mono text-xs text-slate-400">
      <Search size={14} />
      <input className="min-w-0 flex-1 bg-transparent text-slate-100 placeholder:text-slate-600" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function WalletConnectButton() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  if (!mounted) {
    return (
      <button className="flex h-9 items-center gap-2 border border-lime-300/25 bg-lime-300/8 px-3 font-mono text-xs text-lime-200">
        <Wallet size={15} />
        Wallet Sync
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        if (isConnected && chainId !== defaultChain.id) {
          switchChain({ chainId: defaultChain.id });
          return;
        }
        if (isConnected) {
          disconnect();
          return;
        }
        const connector = connectors[0];
        if (connector) connect({ connector, chainId: defaultChain.id });
      }}
      title={error?.message}
      className={cn("flex h-9 items-center gap-2 border px-3 font-mono text-xs hover:bg-lime-300/15", isConnected && chainId !== defaultChain.id ? "border-amber-300/30 bg-amber-300/8 text-amber-200" : "border-lime-300/25 bg-lime-300/8 text-lime-200")}
    >
      <Wallet size={15} />
      {isPending || switching
        ? "Wallet Pending"
        : isConnected && address
          ? chainId !== defaultChain.id
            ? `Switch to ${defaultChain.name}`
            : `${formatAddress(address)} · ${balance ? Number(formatEther(balance.value)).toFixed(4) : "0.0000"} ${balance?.symbol ?? "ETH"} · ${chain?.name ?? "EVM"}`
          : "Connect Wallet"}
    </button>
  );
}

export function Trend({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "down") return <span className="inline-flex items-center gap-1 text-rose-300"><ArrowDownRight size={13} />DOWN</span>;
  if (direction === "flat") return <span className="inline-flex items-center gap-1 text-amber-300"><Activity size={13} />FLAT</span>;
  return <span className="inline-flex items-center gap-1 text-lime-300"><ArrowUpRight size={13} />UP</span>;
}

export function AetherLogo() {
  return (
    <div className="relative h-8 w-8 border border-cyan-300/40 bg-cyan-300/5">
      <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l-2 border-t-2 border-cyan-300" />
      <div className="absolute bottom-1.5 left-2 right-2 h-0.5 bg-violet-300" />
    </div>
  );
}
