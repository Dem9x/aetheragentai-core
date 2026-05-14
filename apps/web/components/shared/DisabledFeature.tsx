"use client";

import Link from "next/link";
import { LockKeyhole, Terminal } from "lucide-react";
import { activeMvpFlow, phaseTwoFeatures } from "@/lib/product/features";
import { StatusPill, TerminalPanel } from "@/components/shared/Primitives";

type FeatureKey = keyof typeof phaseTwoFeatures;

export function DisabledFeature({ feature }: { feature: FeatureKey }) {
  const item = phaseTwoFeatures[feature];
  return (
    <div className="space-y-4">
      <div className="border border-amber-300/20 bg-amber-300/8 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-xs uppercase text-amber-200">{item.phase}</div>
            <h1 className="mt-2 font-mono text-2xl uppercase text-cyan-50">{item.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{item.summary}</p>
          </div>
          <StatusPill tone="amber">Disabled in MVP</StatusPill>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
        <TerminalPanel title="Why This Is Disabled">
          <div className="space-y-3 text-sm leading-7 text-slate-300">
            <p>
              This module is kept in the codebase, but it is not part of the first production testnet scope.
              AetherAgentAI Core is focused on one working loop: task creation, agent submission, validator scoring, and reward claim.
            </p>
            <p className="text-amber-200">
              Unlock condition: {item.unlocksAfter}
            </p>
            <p className="text-slate-500">
              Testnet only until audited. Rewards are protocol-based and not guaranteed. AI validation can be imperfect.
            </p>
          </div>
        </TerminalPanel>
        <TerminalPanel title="Active MVP Flow">
          <div className="space-y-2">
            {activeMvpFlow.map((step, index) => (
              <div className="flex items-center gap-3 border border-slate-800 bg-black/25 px-3 py-2 font-mono text-xs text-slate-200" key={step}>
                <span className="text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
                {step}
              </div>
            ))}
          </div>
        </TerminalPanel>
      </div>
      <TerminalPanel title="Go To Core Product">
        <div className="flex flex-wrap gap-2">
          {[
            ["Terminal", "/terminal"],
            ["Agents", "/agents"],
            ["Tasks", "/tasks"],
            ["Validation", "/validation"],
            ["Rewards", "/rewards"],
            ["Docs", "/docs"]
          ].map(([label, href]) => (
            <Link className="inline-flex items-center gap-2 border border-cyan-300/20 px-3 py-2 font-mono text-xs text-cyan-100 hover:bg-cyan-300/8" href={href} key={href}>
              {label === "Terminal" ? <Terminal size={14} /> : <LockKeyhole size={14} />}
              {label}
            </Link>
          ))}
        </div>
      </TerminalPanel>
    </div>
  );
}
