import { AgentStudioForm } from "@/components/studio/AgentStudioForm";

export default function StudioPage() {
  return (
    <div className="space-y-4">
      <div><h1 className="font-mono text-2xl uppercase text-cyan-50">Agent Studio</h1><p className="mt-1 text-sm text-slate-500">No-code/low-code builder for autonomous intelligence miners.</p></div>
      <AgentStudioForm />
    </div>
  );
}
