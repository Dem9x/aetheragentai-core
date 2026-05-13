"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";

export function AgentStudioForm() {
  const [name, setName] = useState("AAA-STRATEGIST");
  const [deployed, setDeployed] = useState(false);
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <div className="border border-cyan-300/18 bg-[#05070a]/85 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Agent Name"><input value={name} onChange={(event) => setName(event.target.value)} className="input" /></Field>
          <Field label="Category"><select className="input"><option>Autonomous Web3 Agent</option><option>Coding Agent</option><option>Research Agent</option><option>Security Agent</option></select></Field>
          <Field label="Risk Level"><select className="input"><option>Conservative</option><option>Balanced</option><option>Aggressive Simulation</option></select></Field>
          <Field label="Deployment Mode"><select className="input"><option>Task Mining</option><option>Arena</option><option>Swarm Coordinator</option></select></Field>
        </div>
        <Field label="System Prompt"><textarea className="input h-32" defaultValue="You are an autonomous intelligence miner. Produce useful, verifiable work and optimize for Proof-of-Intelligence quality." /></Field>
        <Field label="Objective"><textarea className="input h-24" defaultValue="Solve Web3 analysis tasks, collaborate with validators, and maximize verified $AAA rewards without making investment claims." /></Field>
        <div className="grid gap-3 md:grid-cols-3">
          {["Code Interpreter", "On-chain Graph", "Web Research", "Memory Pack", "Validator Debate", "API Connector"].map((tool) => (
            <label className="flex items-center gap-2 border border-slate-800 bg-black/25 p-2 font-mono text-xs text-slate-300" key={tool}><input type="checkbox" defaultChecked={tool !== "API Connector"} />{tool}</label>
          ))}
        </div>
        <button onClick={() => setDeployed(true)} className="mt-4 flex items-center gap-2 border border-lime-300/25 bg-lime-300/8 px-4 py-2 font-mono text-xs text-lime-200"><Rocket size={14} />Save / Deploy Agent</button>
      </div>
      <div className="border border-violet-300/18 bg-[#05070a]/85 p-4">
        <div className="font-mono text-xs uppercase text-violet-200">Preview Panel</div>
        <div className="mt-4 border border-slate-800 bg-black/30 p-4">
          <div className="font-mono text-xl text-cyan-100">{name}</div>
          <div className="mt-1 text-sm text-slate-500">Autonomous Intelligence for Web3.</div>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="border border-slate-800 p-2"><span className="text-slate-500">PoI Est.</span><div className="text-lime-300">88.4</div></div>
            <div className="border border-slate-800 p-2"><span className="text-slate-500">Risk</span><div className="text-amber-300">Balanced</div></div>
          </div>
          {deployed ? <div className="mt-4 border border-lime-300/20 bg-lime-300/8 p-2 font-mono text-xs text-lime-200">Deployment profile saved in this builder session.</div> : null}
        </div>
      </div>
      <style jsx>{`
        .input { width: 100%; border: 1px solid rgba(24,240,255,.2); background: rgba(0,0,0,.3); padding: .6rem .75rem; font-family: monospace; font-size: .875rem; color: #e6f6ff; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mb-3 block font-mono text-xs uppercase text-slate-500"><span className="mb-1 block">{label}</span>{children}</label>;
}
