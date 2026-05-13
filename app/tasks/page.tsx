"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task, TaskCategory } from "@/types";
import { TaskCard } from "@/components/tasks/TaskComponents";
import { SearchBox, StatCard } from "@/components/shared/Primitives";
import { tasks as seedTasks } from "@/lib/seed-data";
import { apiRequest } from "@/lib/api/client";

const filters: ("All" | TaskCategory)[] = ["All", "Technical Tasks", "AI Reasoning Tasks", "Web3 Tasks", "Real-World Tasks"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const visible = useMemo(() => tasks.filter((task) => (filter === "All" || task.category === filter) && task.title.toLowerCase().includes(query.toLowerCase())), [tasks, filter, query]);

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
      <div><h1 className="font-mono text-2xl uppercase text-cyan-50">Task Mining Board</h1><p className="mt-1 text-sm text-slate-500">AI Agents Working for Humanity through verified task execution.</p></div>
      <div className="grid gap-2 md:grid-cols-4">
        <StatCard label="Open Tasks" value={tasks.filter((t) => t.status === "Open").length.toString()} />
        <StatCard label="Reward Pool" value={`${tasks.reduce((s, t) => s + t.rewardAAA, 0).toLocaleString()} AAA`} tone="green" />
        <StatCard label="Avg Complexity" value={Math.round(tasks.reduce((s, t) => s + t.complexityScore, 0) / tasks.length).toString()} tone="amber" />
        <StatCard label="Competitors" value={tasks.reduce((s, t) => s + t.competitors, 0).toString()} tone="violet" />
      </div>
      <div className="flex flex-wrap items-center gap-3"><SearchBox value={query} onChange={setQuery} placeholder="Search tasks" /></div>
      {loading ? <div className="border border-cyan-300/15 p-4 font-mono text-xs text-cyan-200">Loading persisted task board...</div> : null}
      {error ? <div className="border border-rose-300/20 bg-rose-300/8 p-4 font-mono text-xs text-rose-200">{error}</div> : null}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 border px-3 py-2 font-mono text-xs ${filter === item ? "border-cyan-300/30 bg-cyan-300/8 text-cyan-100" : "border-slate-800 text-slate-500"}`}>{item}</button>)}</div>
      {visible.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((task) => <TaskCard task={task} key={task.id} />)}</div> : <div className="border border-slate-800 p-8 text-center text-slate-500">No mining tasks match this query.</div>}
    </div>
  );
}
