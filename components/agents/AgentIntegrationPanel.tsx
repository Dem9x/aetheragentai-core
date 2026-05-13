"use client";

import { useEffect, useState } from "react";
import { KeyRound, PlugZap, Radio, Save, Server, ShieldCheck } from "lucide-react";
import type { AgentIntegration, AgentRuntimeType } from "@/types";
import { apiRequest } from "@/lib/api/client";
import { DataTable, StatusPill, TerminalPanel } from "@/components/shared/Primitives";

const runtimeTypes: AgentRuntimeType[] = ["HOSTED", "LOCAL_RUNNER", "AETHER_MANAGED"];

export function AgentIntegrationPanel({ agentId, initial }: { agentId: string; initial?: AgentIntegration | null }) {
  const [integration, setIntegration] = useState<AgentIntegration | null>(initial ?? null);
  const [runtimeType, setRuntimeType] = useState<AgentRuntimeType>(initial?.runtimeType ?? "LOCAL_RUNNER");
  const [agentEndpoint, setAgentEndpoint] = useState(initial?.agentEndpoint ?? "");
  const [publicKey, setPublicKey] = useState(initial?.publicKey ?? "");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [capabilities, setCapabilities] = useState((initial?.capabilities ?? ["solidity", "research"]).join(", "));
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ integration: AgentIntegration | null }>(`/api/agents/${agentId}/integration`)
      .then((data) => {
        if (cancelled || !data.integration) return;
        setIntegration(data.integration);
        setRuntimeType(data.integration.runtimeType);
        setAgentEndpoint(data.integration.agentEndpoint ?? "");
        setPublicKey(data.integration.publicKey ?? "");
        setCapabilities(data.integration.capabilities.join(", "));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  async function saveIntegration() {
    setSaving(true);
    setStatus("");
    try {
      const data = await apiRequest<{ integration: AgentIntegration }>(`/api/agents/${agentId}/integration`, {
        method: "POST",
        body: JSON.stringify({
          runtimeType,
          agentEndpoint,
          publicKey,
          webhookSecret: webhookSecret || undefined,
          capabilities: capabilities.split(",").map((item) => item.trim()).filter(Boolean)
        })
      });
      setIntegration(data.integration);
      setWebhookSecret("");
      setStatus("Integration saved. Agent remains user-owned; Aether routes tasks and validates outputs.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save integration");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setStatus("");
    try {
      const result = await apiRequest<{ ok: boolean; result: unknown }>(`/api/agents/${agentId}/test-connection`, { method: "POST" });
      setStatus(`Connection OK: ${JSON.stringify(result.result).slice(0, 180)}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <TerminalPanel
      title="User-Owned Agent Integration"
      action={<StatusPill tone={integration?.status === "ACTIVE" ? "green" : integration?.status === "FAILED" ? "red" : "amber"}>{integration?.status ?? "UNCONFIGURED"}</StatusPill>}
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            {runtimeTypes.map((item) => (
              <button
                key={item}
                onClick={() => setRuntimeType(item)}
                className={`border px-3 py-3 text-left font-mono text-xs ${runtimeType === item ? "border-cyan-300/35 bg-cyan-300/8 text-cyan-100" : "border-slate-800 text-slate-500"}`}
              >
                <span className="mb-2 block">{item}</span>
                <span className="text-[10px] normal-case leading-5 text-slate-500">
                  {item === "HOSTED" ? "Your server endpoint receives tasks." : item === "LOCAL_RUNNER" ? "Your CLI/VPS polls Aether tasks." : "Aether worker executes with user-approved config."}
                </span>
              </button>
            ))}
          </div>

          <label className="block font-mono text-xs uppercase text-slate-500">
            Agent Endpoint
            <input value={agentEndpoint} onChange={(event) => setAgentEndpoint(event.target.value)} placeholder="https://your-agent.example.com/aether/run" className="mt-1 w-full border border-cyan-300/20 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600" />
            <span className="mt-1 block text-[10px] normal-case leading-5 text-slate-500">
              Untuk HOSTED saja. Isi URL HTTPS agent milik user, contoh: https://api.domainmu.com/aether/run. Untuk LOCAL_RUNNER boleh kosong karena CLI yang polling task.
            </span>
          </label>
          <label className="block font-mono text-xs uppercase text-slate-500">
            Public Key
            <input value={publicKey} onChange={(event) => setPublicKey(event.target.value)} placeholder="agent signing public key or DID" className="mt-1 w-full border border-cyan-300/20 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600" />
            <span className="mt-1 block text-[10px] normal-case leading-5 text-slate-500">
              Opsional untuk sekarang. Pakai public key agent untuk verifikasi signature output di versi production. Bisa pakai SSH Ed25519 public key, DID, atau wallet-style signing public key. Jangan isi private key.
            </span>
          </label>
          <label className="block font-mono text-xs uppercase text-slate-500">
            Runner / Webhook Secret
            <input value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} placeholder="stored as hash only" type="password" className="mt-1 w-full border border-cyan-300/20 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600" />
            <span className="mt-1 block text-[10px] normal-case leading-5 text-slate-500">
              Buat sendiri sebagai token rahasia antara runner user dan Aether. Secret ini disimpan hash-only di Aether, lalu dipakai CLI lewat --secret atau header x-runner-secret.
            </span>
          </label>
          <label className="block font-mono text-xs uppercase text-slate-500">
            Capabilities
            <input value={capabilities} onChange={(event) => setCapabilities(event.target.value)} placeholder="solidity, audit, research" className="mt-1 w-full border border-cyan-300/20 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600" />
            <span className="mt-1 block text-[10px] normal-case leading-5 text-slate-500">
              Tag kemampuan agent dipisah koma. Contoh: solidity, audit, reentrancy, python, defi, research. Aether memakai ini untuk matching task.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button disabled={saving} onClick={saveIntegration} className="flex items-center gap-2 border border-lime-300/25 bg-lime-300/8 px-3 py-2 font-mono text-xs text-lime-200 disabled:opacity-50">
              <Save size={14} />
              {saving ? "Saving" : "Save Integration"}
            </button>
            <button disabled={testing || runtimeType !== "HOSTED"} onClick={testConnection} className="flex items-center gap-2 border border-cyan-300/25 bg-cyan-300/8 px-3 py-2 font-mono text-xs text-cyan-200 disabled:opacity-50">
              <PlugZap size={14} />
              {testing ? "Testing" : "Test Hosted Agent"}
            </button>
          </div>
          {status ? <div className="border border-slate-800 bg-black/30 p-3 font-mono text-xs text-slate-300">{status}</div> : null}
        </div>

        <div className="space-y-3">
          <div className="border border-amber-300/20 bg-amber-300/8 p-3 text-sm leading-6 text-amber-100">
            Agent tetap milik user. Aether hanya routing task, validasi output, dan settlement reward protocol. Jangan kirim private prompt atau chain-of-thought.
          </div>
          <div className="grid gap-2 text-xs leading-5 text-slate-400">
            <div className="border border-cyan-300/15 bg-cyan-300/5 p-3">
              <div className="mb-1 flex items-center gap-2 font-mono uppercase text-cyan-100"><ShieldCheck size={13} /> Secret dibuat dari mana?</div>
              Jalankan <code className="text-cyan-100">node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;</code>, simpan hasilnya di field secret, lalu pakai secret yang sama saat <code className="text-cyan-100">aether-agent.cmd register --secret ...</code>.
            </div>
            <div className="border border-violet-300/15 bg-violet-300/5 p-3">
              <div className="mb-1 flex items-center gap-2 font-mono uppercase text-violet-100"><KeyRound size={13} /> Public key ambil dari mana?</div>
              Untuk LOCAL_RUNNER boleh kosong dulu. Untuk signing, buat key: <code className="text-violet-100">ssh-keygen -t ed25519 -C &quot;aether-agent&quot; -f .\aether_agent_ed25519</code>, lalu paste isi file <code className="text-violet-100">aether_agent_ed25519.pub</code>. Private key jangan pernah diupload.
            </div>
          </div>
          <DataTable
            columns={["Mode", "How It Works"]}
            rows={[
              [<span className="inline-flex items-center gap-1" key="hosted"><Server size={13} />HOSTED</span>, "Aether calls your HTTPS agent endpoint."],
              [<span className="inline-flex items-center gap-1" key="runner"><Radio size={13} />LOCAL_RUNNER</span>, "Your runner polls /api/runner/tasks and submits outputs."],
              ["AETHER_MANAGED", "Future hosted runtime using encrypted user-approved provider config."]
            ]}
          />
        </div>
      </div>
    </TerminalPanel>
  );
}
