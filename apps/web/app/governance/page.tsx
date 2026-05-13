"use client";

import { useState } from "react";
import type { GovernanceProposal } from "@/types";
import { StatCard, StatusPill } from "@/components/shared/Primitives";
import { governanceProposals } from "@/lib/seed-data";
import { formatInteger } from "@/lib/utils/format";

export default function GovernancePage() {
  const [selected, setSelected] = useState<GovernanceProposal | null>(null);
  return (
    <div className="space-y-4">
      <Header title="Governance" copy="Proposal review for protocol priorities, reward structures, and treasury allocation." />
      <div className="grid gap-2 md:grid-cols-4"><StatCard label="Voting Power" value="18,420 AAA" /><StatCard label="Active Votes" value="1" tone="green" /><StatCard label="Treasury" value="12.8M AAA" tone="violet" /><StatCard label="Delegates" value="441" tone="amber" /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{governanceProposals.map((proposal) => <GovernanceProposalCard proposal={proposal} onOpen={() => setSelected(proposal)} key={proposal.id} />)}</div>
      {selected ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="w-full max-w-lg border border-cyan-300/25 bg-[#05070a] p-4"><div className="font-mono text-xs uppercase text-cyan-200">{selected.category} Proposal</div><h2 className="mt-3 font-mono text-xl text-cyan-50">{selected.title}</h2><p className="mt-3 text-sm leading-7 text-slate-300">{selected.summary}</p><button onClick={() => setSelected(null)} className="mt-4 border border-lime-300/25 px-3 py-2 font-mono text-xs text-lime-200">Record Vote Intent</button></div></div> : null}
    </div>
  );
}

function GovernanceProposalCard({ proposal, onOpen }: { proposal: GovernanceProposal; onOpen: () => void }) {
  const total = proposal.votesFor + proposal.votesAgainst;
  return <div className="border border-cyan-300/18 bg-[#05070a]/85 p-4"><div className="flex justify-between gap-3"><div className="font-mono text-sm text-cyan-100">{proposal.title}</div><StatusPill tone={proposal.status === "Active" ? "green" : "violet"}>{proposal.status}</StatusPill></div><p className="mt-3 text-sm leading-6 text-slate-300">{proposal.summary}</p><div className="mt-4 h-2 bg-slate-800"><div className="h-full bg-lime-300" style={{ width: `${(proposal.votesFor / total) * 100}%` }} /></div><div className="mt-2 font-mono text-xs text-slate-500">{formatInteger(proposal.votesFor)} for · {formatInteger(proposal.votesAgainst)} against</div><button onClick={onOpen} className="mt-4 border border-cyan-300/20 px-3 py-2 font-mono text-xs text-cyan-200">Open Proposal</button></div>;
}

function Header({ title, copy }: { title: string; copy: string }) {
  return <div><h1 className="font-mono text-2xl uppercase text-cyan-50">{title}</h1><p className="mt-1 text-sm text-slate-500">{copy}</p></div>;
}
