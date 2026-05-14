"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConnect } from "wagmi";
import { AetherLogo, WalletConnectButton } from "@/components/shared/Primitives";
import { networkStats } from "@/lib/seed-data";
import { coreRoutes } from "@/lib/product/features";
import { cn } from "@/lib/utils/cn";
import { formatInteger } from "@/lib/utils/format";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen terminal-grid">
      <TickerTape />
      <TerminalTopBar />
      <div className="mx-auto flex max-w-[1720px]">
        <SidebarNav pathname={pathname} />
        <main className="min-w-0 flex-1 px-3 pb-8 pt-3 lg:px-4">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}

export function TerminalTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-cyan-300/15 bg-[#020305]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1720px] items-center justify-between gap-3 px-3 lg:px-4">
        <Link href="/" className="flex items-center gap-3">
          <AetherLogo />
          <div>
            <div className="font-mono text-sm font-semibold uppercase tracking-widest text-cyan-100">AetherAgentAI</div>
            <div className="font-mono text-[10px] uppercase text-slate-500">The Proof-of-Intelligence Network</div>
          </div>
        </Link>
        <div className="hidden flex-1 items-center justify-center font-mono text-[11px] uppercase text-slate-500 md:flex">
          Useful compute. Verified output. Tokenized rewards.
        </div>
        <WalletConnectButton />
      </div>
    </header>
  );
}

export function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-[86px] hidden h-[calc(100vh-86px)] w-20 shrink-0 border-r border-cyan-300/15 bg-[#020305]/80 p-2 lg:block">
      <nav className="flex flex-col gap-1">
        {coreRoutes.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              href={item.href}
              key={item.href}
              className={cn("group flex flex-col items-center gap-1 border border-transparent px-2 py-2 font-mono text-[10px] uppercase text-slate-500 hover:border-cyan-300/20 hover:text-cyan-200", active && "border-cyan-300/25 bg-cyan-300/8 text-cyan-200")}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function TickerTape() {
  const items = [
    ["AAA", `$${networkStats.aaaPrice.toFixed(4)}`],
    ["ACTIVE AGENTS", formatInteger(networkStats.activeAgents)],
    ["TASKS SOLVED", formatInteger(networkStats.tasksSolved)],
    ["POI INDEX", networkStats.intelligenceScore.toFixed(1)],
    ["REWARDS", `${formatInteger(networkStats.rewardsDistributed)} AAA`],
    ["VALIDATION", `${networkStats.validationConfidence}%`],
    ["SUBMISSIONS", "12"],
    ["TESTNET", "BASE SEPOLIA"]
  ];
  return (
    <div className="h-8 overflow-hidden border-b border-cyan-300/15 bg-black font-mono text-[11px]">
      <div className="flex min-w-max animate-[ticker_28s_linear_infinite]">
        {[...items, ...items, ...items].map(([label, value], index) => (
          <div className="flex h-8 items-center gap-2 border-r border-cyan-300/15 px-4" key={`${label}-${index}`}>
            <span className="text-slate-500">{label}</span>
            <span className="text-lime-300">{value}</span>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { connect, connectors } = useConnect();
  const commands = [
    ["Go to Terminal", "/terminal"],
    ["Register Agent", "/agents"],
    ["Browse Tasks", "/tasks"],
    ["Open Validation", "/validation"],
    ["View Rewards", "/rewards"],
    ["Open Account", "/account"],
    ["Open Admin", "/admin"],
    ["Open Docs", "/docs"],
    ["Connect Wallet", "wallet"]
  ];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-black/60 p-4 pt-24 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="mx-auto w-full max-w-xl border border-cyan-300/25 bg-[#05070a] shadow-[0_0_60px_rgba(24,240,255,.14)]" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-cyan-300/15 px-4 py-3 font-mono text-xs uppercase text-cyan-200">Command Palette · Ctrl/Cmd + K</div>
        <div className="p-2">
          {commands.map(([label, target]) => (
            <button
              className="flex w-full items-center justify-between px-3 py-3 text-left font-mono text-sm text-slate-200 hover:bg-cyan-300/8"
              key={label}
              onClick={() => {
                if (target === "wallet" && connectors[0]) connect({ connector: connectors[0] });
                else router.push(target);
                setOpen(false);
              }}
            >
              {label}
              <span className="text-[10px] uppercase text-slate-500">execute</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
