"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task, TaskCategory } from "@/types";
import { TaskCard } from "@/components/tasks/TaskComponents";
import { DataTable, SearchBox, StatCard, TerminalPanel } from "@/components/shared/Primitives";
import { apiRequest } from "@/lib/api/client";
import { taskTemplates } from "@/lib/task-templates";
import { Plus } from "lucide-react";
import { useAccount } from "wagmi";

const filters: ("All" | TaskCategory)[] = ["All", "Technical Tasks", "AI Reasoning Tasks", "Web3 Tasks", "Real-World Tasks"];
const inputClass = "w-full border border-cyan-300/20 bg-black/30 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-600";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const visible = useMemo(() => {
    const needle = query.toLowerCase();
    return tasks.filter((task) => {
      const matchesFilter = filter === "All" || task.category === filter;
      const haystack = `${task.title} ${task.creatorName} ${task.creatorType} ${task.rewardFundingStatus} ${task.validationStatus}`.toLowerCase();
      return matchesFilter && haystack.includes(needle);
    });
  }, [tasks, filter, query]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ tasks: Task[] }>("/api/tasks")
      .then((data) => {
        if (!cancelled) setTasks(data.tasks);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load tasks");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div><h1 className="font-mono text-2xl uppercase text-cyan-50">Task Mining Board</h1><p className="mt-1 text-sm text-slate-500">Production task board with explicit creator, funding, validation, and settlement states.</p></div>
      <div className="grid gap-2 md:grid-cols-4">
        <StatCard label="Open Tasks" value={tasks.filter((t) => t.status === "Open").length.toString()} />
        <StatCard label="Funded/Escrowed" value={tasks.filter((t) => ["FUNDED", "ESCROWED", "ALLOCATED"].includes(t.rewardFundingStatus)).length.toString()} tone="green" />
        <StatCard label="In Validation" value={tasks.filter((t) => t.validationStatus === "IN_VALIDATION").length.toString()} tone="amber" />
        <StatCard label="Finalized" value={tasks.filter((t) => t.validationStatus === "FINALIZED").length.toString()} tone="violet" />
      </div>
      <TerminalPanel title="Task Templates">
        <DataTable
          columns={["Template", "Category", "Validation", "Output Schema"]}
          rows={taskTemplates.map((template) => [
            template.title,
            template.category,
            template.validationMode,
            Object.keys(template.expectedOutputSchema).join(", ")
          ])}
        />
      </TerminalPanel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search tasks" />
        <CreateTaskModal onCreate={(task) => setTasks([task, ...tasks])} />
      </div>
      {loading ? <div className="border border-cyan-300/15 p-4 font-mono text-xs text-cyan-200">Loading persisted task board...</div> : null}
      {error ? <div className="border border-rose-300/20 bg-rose-300/8 p-4 font-mono text-xs text-rose-200">{error}</div> : null}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 border px-3 py-2 font-mono text-xs ${filter === item ? "border-cyan-300/30 bg-cyan-300/8 text-cyan-100" : "border-slate-800 text-slate-500"}`}>{item}</button>)}</div>
      {visible.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((task) => <TaskCard task={task} key={task.id} />)}</div> : <div className="border border-slate-800 p-8 text-center text-slate-500">No real tasks found. Create or index a funded task first.</div>}
    </div>
  );
}

function CreateTaskModal({ onCreate }: { onCreate: (task: Task) => void }) {
  const { address, isConnected } = useAccount();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("Review Solidity contract for reentrancy");
  const [creatorType, setCreatorType] = useState<"USER" | "DEVELOPER" | "DAO" | "PROTOCOL">("USER");
  const [category, setCategory] = useState<TaskCategory>("Technical Tasks");
  const [creatorName, setCreatorName] = useState("Aether Task Creator");
  const [brief, setBrief] = useState("Analyze the provided contract metadata and submit a concise vulnerability report with severity and confidence.");
  const [expectedOutput, setExpectedOutput] = useState("JSON report with summary, findings, severity, confidence, and evidence URI.");
  const [rewardAmount, setRewardAmount] = useState(100);
  const [complexity, setComplexity] = useState(85);

  async function createTask() {
    setSaving(true);
    setError("");
    try {
      if (!isConnected || !address) throw new Error("Connect and sign in with your wallet before creating a real task.");
      const data = await apiRequest<{ task: Task }>("/api/tasks/create-metadata", {
        method: "POST",
        body: JSON.stringify({
          title,
          category,
          creatorType,
          creatorName,
          creatorAddress: address,
          creatorLabel: creatorType === "USER" ? "User-created task" : `${creatorType} task`,
          brief,
          expectedOutput,
          validationRules: ["accuracy >= 80", "format must match expected schema", "safety must pass"],
          complexity,
          rewardAmount,
          fundingStatus: rewardAmount > 0 ? "FUNDED" : "UNFUNDED",
          validationMethod: "HUMAN_VALIDATOR_RUBRIC",
          requiredValidatorQuorum: creatorType === "USER" || creatorType === "DEVELOPER" ? 1 : 3,
          passingScore: Math.min(95, Math.max(50, complexity))
        })
      });
      onCreate(data.task);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Task creation failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-2 border border-lime-300/25 bg-lime-300/8 px-3 font-mono text-xs text-lime-200">
        <Plus size={14} />
        Create Task
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl border border-cyan-300/25 bg-[#05070a]" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-cyan-300/15 px-4 py-3 font-mono text-xs uppercase text-cyan-200">Create Real Task</div>
            <div className="grid gap-3 p-4 md:grid-cols-2">
              <Field label="Title"><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
              <Field label="Creator Type">
                <select className={inputClass} value={creatorType} onChange={(event) => setCreatorType(event.target.value as typeof creatorType)}>
                  <option value="USER">USER - normal signed wallet</option>
                  <option value="DEVELOPER">DEVELOPER - builder task</option>
                  <option value="DAO">DAO - admin only</option>
                  <option value="PROTOCOL">PROTOCOL - admin only</option>
                </select>
              </Field>
              <Field label="Category">
                <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value as TaskCategory)}>
                  {filters.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Creator Name"><input className={inputClass} value={creatorName} onChange={(event) => setCreatorName(event.target.value)} /></Field>
              <Field label="Reward AAA"><input className={inputClass} type="number" min={0} value={rewardAmount} onChange={(event) => setRewardAmount(Number(event.target.value))} /></Field>
              <Field label="Complexity"><input className={inputClass} type="number" min={1} max={100} value={complexity} onChange={(event) => setComplexity(Number(event.target.value))} /></Field>
              <Field label="Brief"><textarea className={`${inputClass} h-24`} value={brief} onChange={(event) => setBrief(event.target.value)} /></Field>
              <Field label="Expected Output"><textarea className={`${inputClass} h-24`} value={expectedOutput} onChange={(event) => setExpectedOutput(event.target.value)} /></Field>
              {error ? <div className="md:col-span-2 border border-rose-300/25 bg-rose-300/8 p-2 font-mono text-xs text-rose-200">{error}</div> : null}
              <p className="md:col-span-2 text-xs leading-5 text-slate-500">
                USER/DEVELOPER tasks can be created by the signed wallet. DAO/PROTOCOL tasks require the signed wallet to be listed in ADMIN_WALLET_ADDRESSES.
              </p>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button onClick={() => setOpen(false)} className="border border-slate-700 px-3 py-2 font-mono text-xs text-slate-300">Cancel</button>
                <button disabled={saving} onClick={createTask} className="border border-lime-300/25 bg-lime-300/8 px-3 py-2 font-mono text-xs text-lime-200 disabled:opacity-50">{saving ? "Creating..." : "Create Task"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 font-mono text-[10px] uppercase text-slate-500">{label}{children}</label>;
}
