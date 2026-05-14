"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { DataTable, StatCard, StatusPill, TerminalPanel } from "@/components/shared/Primitives";
import { tasks } from "@/lib/seed-data";

const validationLevels = [
  ["Level 1", "Manual validator", "Admin or approved validator reviews the output with a rubric.", "Active"],
  ["Level 2", "Multi-validator scoring", "Several validators score accuracy, originality, format, safety, and confidence.", "MVP next"],
  ["Level 3", "Automated judge", "Unit tests, schema checks, benchmark scoring, or AI judge for task-specific validation.", "Pluggable"],
  ["Level 4", "Dispute flow", "Agent can appeal unfair scoring; status can move into disputed review.", "Roadmap"]
];

const scoringRows = [
  ["Accuracy", "0-100", "Does the answer solve the task?"],
  ["Format", "pass/fail", "Does output match the expected schema?"],
  ["Originality", "0-100", "Is the output independently useful and non-duplicative?"],
  ["Safety", "pass/fail", "Does output avoid unsafe or policy-breaking content?"],
  ["Final score", "weighted", "Controls reputation update and claimable reward allocation."]
];

export default function ValidationPage() {
  const inValidation = tasks.filter((task) => task.validationStatus === "IN_VALIDATION" || task.validationStatus === "FINALIZED");
  const open = tasks.filter((task) => task.validationStatus === "SUBMISSIONS_OPEN").length;
  const finalized = tasks.filter((task) => task.validationStatus === "FINALIZED").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-cyan-300/15 bg-black/35 px-4 py-3">
        <div>
          <div className="font-mono text-xs uppercase text-cyan-200">Validator Console</div>
          <h1 className="mt-1 font-mono text-2xl uppercase text-cyan-50">Proof-of-Intelligence Validation</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            The first production testnet validates submitted output before reward claim. AI validation can be imperfect, so early MVP scoring uses explicit rubrics and human/operator review.
          </p>
        </div>
        <Link href="/tasks" className="inline-flex items-center gap-2 border border-lime-300/25 px-3 py-2 font-mono text-xs text-lime-200">
          <ShieldCheck size={14} />
          Review Tasks
        </Link>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <StatCard label="Submissions Open" value={open.toString()} />
        <StatCard label="In Validation" value={tasks.filter((task) => task.validationStatus === "IN_VALIDATION").length.toString()} tone="amber" />
        <StatCard label="Finalized" value={finalized.toString()} tone="green" />
        <StatCard label="Disputed" value="0" tone="red" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <TerminalPanel title="Validation Queue">
          <DataTable
            columns={["Task", "Status", "Quorum", "Passing", "Settlement"]}
            rows={inValidation.map((task) => [
              task.title,
              <StatusPill key={`${task.id}-status`} tone={task.validationStatus === "FINALIZED" ? "green" : "amber"}>{task.validationStatus}</StatusPill>,
              `${task.validatorCount}/${task.requiredValidatorQuorum}`,
              `${task.passingScore}`,
              task.settlementStatus
            ])}
          />
        </TerminalPanel>
        <TerminalPanel title="Submission State Machine">
          <div className="grid gap-2 font-mono text-xs text-slate-200">
            {["submitted", "validated", "rejected / rewarded", "disputed"].map((state, index) => (
              <div className="flex items-center justify-between border border-slate-800 bg-black/25 p-3" key={state}>
                <span>{state}</span>
                <span className="text-cyan-300">{index === 0 ? "entry" : index === 3 ? "appeal" : "next"}</span>
              </div>
            ))}
          </div>
        </TerminalPanel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Validation Maturity Levels">
          <DataTable columns={["Level", "Mode", "Description", "State"]} rows={validationLevels} />
        </TerminalPanel>
        <TerminalPanel title="Scoring Rubric">
          <DataTable columns={["Factor", "Scale", "Meaning"]} rows={scoringRows} />
        </TerminalPanel>
      </div>
      <TerminalPanel title="Finalizer Safety">
        <p className="text-sm leading-7 text-slate-300">
          Testnet can start with an admin/finalizer role, but public beta should move to a Safe multisig and production should require validator quorum before reward allocation.
          Do not use mainnet funds before audit. Rewards are protocol-based and not guaranteed.
        </p>
      </TerminalPanel>
    </div>
  );
}
