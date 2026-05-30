"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api/client";
import { DataTable, StatCard, StatusPill, TerminalPanel } from "@/components/shared/Primitives";
import { formatDateTime } from "@/lib/utils/format";

type ValidationQueueItem = {
  id: string;
  chainSubmissionId: string | null;
  taskId: string;
  chainTaskId: string | null;
  taskTitle: string;
  taskRewardAmount: string;
  taskPassingScore: number;
  requiredValidatorQuorum: number;
  taskValidationStatus: string;
  taskSettlementStatus: string;
  agentId: string | null;
  agentName: string | null;
  submitterAddress: string;
  solutionURI: string;
  solutionHash: string;
  status: string;
  poiScore: string | null;
  createdAt: string;
  validations: Array<{
    id: string;
    validatorAddress: string;
    score: number;
    confidence: number;
    resultURI: string;
    finalized: boolean;
    createdAt: string;
  }>;
};

type ValidationQueueResponse = {
  access: { address: string; isValidator: boolean; isAdmin: boolean };
  stats: {
    pendingSubmissions: number;
    totalValidations: number;
    finalizedTasks: number;
    claimableRewards: number;
  };
  submissions: ValidationQueueItem[];
  safety: string;
};

const inputClass = "w-full border border-cyan-300/20 bg-black/30 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-600";

export function ValidationConsole() {
  const [data, setData] = useState<ValidationQueueResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(85);
  const [confidence, setConfidence] = useState(85);
  const [formatPass, setFormatPass] = useState(true);
  const [safetyPass, setSafetyPass] = useState(true);
  const [reason, setReason] = useState("Output follows the requested schema and provides useful evidence for the task.");
  const [result, setResult] = useState("");

  const selected = useMemo(() => data?.submissions.find((item) => item.id === selectedId) ?? data?.submissions[0] ?? null, [data, selectedId]);

  async function load() {
    setError("");
    try {
      const response = await apiRequest<ValidationQueueResponse>("/api/validation/queue");
      setData(response);
      setSelectedId((current) => current || response.submissions[0]?.id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load validation queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiRequest<ValidationQueueResponse>("/api/validation/queue")
      .then((response) => {
        if (!active) return;
        setData(response);
        setSelectedId((current) => current || response.submissions[0]?.id || "");
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Unable to load validation queue");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitValidation() {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    setResult("");
    try {
      const response = await apiRequest<{ aggregate: { validatorCount: number; averageScore: number; averageConfidence: number; quorumMet: boolean; accepted: boolean; claimableRewardAAA: number } }>(`/api/validation/submissions/${selected.id}`, {
        method: "POST",
        body: JSON.stringify({ score, confidence, reason, formatPass, safetyPass })
      });
      setResult(JSON.stringify(response.aggregate, null, 2));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Validation submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="border border-cyan-300/15 p-4 font-mono text-xs text-cyan-200">Loading validator queue...</div>;

  if (error && !data) {
    return (
      <TerminalPanel title="Validator Access Required">
        <p className="text-sm leading-7 text-slate-300">{error}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">Connect wallet, sign in on /account, then use a wallet listed in VALIDATOR_WALLET_ADDRESSES or ADMIN_WALLET_ADDRESSES.</p>
      </TerminalPanel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-4">
        <StatCard label="Pending Submissions" value={String(data?.stats.pendingSubmissions ?? 0)} />
        <StatCard label="Validations" value={String(data?.stats.totalValidations ?? 0)} tone="violet" />
        <StatCard label="Finalized Tasks" value={String(data?.stats.finalizedTasks ?? 0)} tone="green" />
        <StatCard label="Claimable Rewards" value={String(data?.stats.claimableRewards ?? 0)} tone="amber" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <TerminalPanel title="Pending Submission Queue" action={<button onClick={() => { setLoading(true); load(); }} className="text-cyan-300"><RefreshCw size={14} /></button>}>
          {data?.submissions.length ? (
            <DataTable
              columns={["Task", "Agent", "Status", "Quorum", "Score", "Created"]}
              rows={data.submissions.map((item) => [
                <button key={`${item.id}-task`} onClick={() => setSelectedId(item.id)} className="text-left text-cyan-200 hover:text-lime-200">{item.taskTitle}</button>,
                item.agentName ?? item.agentId ?? "unlinked",
                <StatusPill key={`${item.id}-status`} tone={item.status === "VALIDATED" ? "green" : item.status === "REJECTED" ? "red" : "amber"}>{item.status}</StatusPill>,
                `${item.validations.length}/${item.requiredValidatorQuorum}`,
                item.poiScore ?? "-",
                formatDateTime(item.createdAt)
              ])}
            />
          ) : (
            <p className="text-sm text-slate-500">No pending submissions. Runner submissions will appear here after agents submit output.</p>
          )}
        </TerminalPanel>

        <TerminalPanel title="Validator Scoring">
          {selected ? (
            <div className="space-y-3">
              <div className="border border-slate-800 bg-black/25 p-3">
                <div className="font-mono text-sm text-cyan-100">{selected.taskTitle}</div>
                <div className="mt-2 grid gap-1 font-mono text-[11px] text-slate-500">
                  <span>Submission: {selected.id}</span>
                  <span>Solution URI: {selected.solutionURI}</span>
                  <span>Solution Hash: {selected.solutionHash}</span>
                  <span>Quorum: {selected.validations.length}/{selected.requiredValidatorQuorum}</span>
                </div>
              </div>
              <Field label="Score"><input className={inputClass} type="number" min={0} max={100} value={score} onChange={(event) => setScore(Number(event.target.value))} /></Field>
              <Field label="Confidence"><input className={inputClass} type="number" min={0} max={100} value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 border border-slate-800 bg-black/25 p-2 font-mono text-xs text-slate-300"><input type="checkbox" checked={formatPass} onChange={(event) => setFormatPass(event.target.checked)} />Format pass</label>
                <label className="flex items-center gap-2 border border-slate-800 bg-black/25 p-2 font-mono text-xs text-slate-300"><input type="checkbox" checked={safetyPass} onChange={(event) => setSafetyPass(event.target.checked)} />Safety pass</label>
              </div>
              <Field label="Reason"><textarea className={`${inputClass} h-28`} value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
              {error ? <div className="border border-rose-300/20 bg-rose-300/8 p-2 font-mono text-xs text-rose-200">{error}</div> : null}
              {result ? <pre className="max-h-44 overflow-auto border border-slate-800 bg-black/30 p-3 text-xs text-slate-300 scrollbar-thin">{result}</pre> : null}
              <button disabled={submitting} onClick={submitValidation} className="flex w-full items-center justify-center gap-2 border border-lime-300/25 bg-lime-300/8 px-3 py-2 font-mono text-xs text-lime-200 disabled:opacity-50">
                <ShieldCheck size={14} />
                {submitting ? "Submitting..." : "Submit Validation"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a submission to score.</p>
          )}
        </TerminalPanel>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 font-mono text-[10px] uppercase text-slate-500">{label}{children}</label>;
}
