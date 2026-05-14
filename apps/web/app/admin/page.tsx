"use client";

import { useEffect, useState } from "react";
import { Activity, KeyRound, Play, ShieldAlert } from "lucide-react";
import { useAccount } from "wagmi";
import { DataTable, StatCard, StatusPill, TerminalPanel } from "@/components/shared/Primitives";
import { apiRequest } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils/format";
import { formatAddress } from "@/lib/wallet";

type AdminOverview = {
  access: {
    configured: boolean;
    isAdmin: boolean;
    requestedAddress: string | null;
    mode: string;
  };
  contracts: Record<string, string | undefined>;
  env: {
    chainName: string;
    chainId: string;
    hasRpc: boolean;
    hasIndexerToken: boolean;
    hasValidatorSigner: boolean;
    databaseConfigured: boolean;
    metadataStorage: string;
  };
  database: {
    agents: number;
    tasks: number;
    submissions: number;
    validations: number;
    rewards: number;
    indexedEvents: number;
  };
  indexerState: Array<{ id: string; chainId: number; lastProcessedBlock: string; updatedAt: string }>;
  recentEvents: Array<{ eventName: string; txHash: string; blockNumber: string; contractAddress: string }>;
  activity: Array<{ id: string; type: string; message: string; createdAt: string; severity: string }>;
  safety: string[];
};

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [indexerToken, setIndexerToken] = useState("");
  const [indexerResult, setIndexerResult] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/overview")
      .then(async (response) => {
        const payload = await response.json();
        if (!payload.ok) throw new Error(payload.error.message);
        return payload.data as AdminOverview;
      })
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load admin overview");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  async function runIndexer() {
    setRunning(true);
    setIndexerResult("");
    try {
      const result = await apiRequest<Record<string, unknown>>("/api/indexer/run-once", {
        method: "POST",
        headers: { Authorization: `Bearer ${indexerToken}` }
      });
      setIndexerResult(JSON.stringify(result, null, 2));
    } catch (reason) {
      setIndexerResult(reason instanceof Error ? reason.message : "Indexer run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl uppercase text-cyan-50">Admin Console</h1>
          <p className="mt-1 text-sm text-slate-500">Protocol operator dashboard for contracts, indexing, validation queues, and production readiness.</p>
        </div>
        <StatusPill tone={overview?.access.isAdmin ? "green" : overview?.access.configured ? "red" : "amber"}>
          {overview?.access.isAdmin ? "Admin Wallet" : overview?.access.configured ? "Read Restricted" : "Read Only"}
        </StatusPill>
      </div>

      {loading ? <div className="border border-cyan-300/15 p-4 font-mono text-xs text-cyan-200">Loading admin overview...</div> : null}
      {error ? <div className="border border-rose-300/20 bg-rose-300/8 p-4 font-mono text-xs text-rose-200">{error}</div> : null}
      {error ? (
        <TerminalPanel title="Admin Access Required">
          <div className="space-y-2 text-sm leading-6 text-slate-300">
            <p>Admin console hanya terbuka untuk wallet yang sudah sign in dan masuk daftar `ADMIN_WALLET_ADDRESSES`.</p>
            <p>Flow: connect wallet, klik Sign In di halaman Account, lalu pastikan address wallet ada di env admin.</p>
          </div>
        </TerminalPanel>
      ) : null}

      <div className="grid gap-2 md:grid-cols-4">
        <StatCard label="Wallet" value={isConnected && address ? formatAddress(address) : "not connected"} />
        <StatCard label="Chain" value={overview?.env.chainName ?? "baseSepolia"} tone="violet" />
        <StatCard label="Indexed Events" value={String(overview?.database.indexedEvents ?? 0)} tone="green" />
        <StatCard label="Validator Signer" value={overview?.env.hasValidatorSigner ? "configured" : "missing"} tone={overview?.env.hasValidatorSigner ? "green" : "amber"} />
      </div>
      {overview && !overview.env.databaseConfigured ? (
        <div className="border border-amber-300/25 bg-amber-300/8 p-3 font-mono text-xs text-amber-200">
          DATABASE_URL is not configured. Real app data is unavailable; start Postgres and set DATABASE_URL for indexed production data.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <TerminalPanel title="Production Safety">
          <div className="grid gap-2">
            {(overview?.safety ?? ["testnet only until audited", "rewards are protocol-based and not guaranteed", "AI validation can be imperfect", "do not use mainnet funds before audit"]).map((item) => (
              <div className="flex items-center gap-2 border border-amber-300/15 bg-amber-300/5 p-3 font-mono text-xs text-amber-200" key={item}>
                <ShieldAlert size={14} />
                {item}
              </div>
            ))}
          </div>
        </TerminalPanel>
        <TerminalPanel title="Access Model">
          <div className="space-y-2 font-mono text-xs">
            <Line label="Mode" value={overview?.access.mode ?? "loading"} />
            <Line label="Allowlist Configured" value={overview?.access.configured ? "yes" : "no"} />
            <Line label="Connected Wallet" value={overview?.access.requestedAddress ?? "none"} />
            <Line label="Admin" value={overview?.access.isAdmin ? "yes" : "no"} tone={overview?.access.isAdmin ? "green" : "amber"} />
          </div>
        </TerminalPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Contract Addresses">
          <DataTable
            columns={["Contract", "Address", "Status"]}
            rows={Object.entries(overview?.contracts ?? {}).map(([name, value]) => [
              name,
              value ? formatAddress(value) : "not configured",
              <StatusPill key={name} tone={value ? "green" : "amber"}>{value ? "Ready" : "Missing"}</StatusPill>
            ])}
          />
        </TerminalPanel>
        <TerminalPanel title="Database Stats">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(overview?.database ?? { agents: 0, tasks: 0, submissions: 0, validations: 0, rewards: 0, indexedEvents: 0 }).map(([key, value]) => (
              <StatCard key={key} label={key} value={String(value)} />
            ))}
          </div>
        </TerminalPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TerminalPanel title="Indexer Control" action={<Activity size={14} className="text-cyan-300" />}>
          <p className="mb-3 text-sm leading-6 text-slate-400">Runs one indexer pass. Requires `INDEXER_ADMIN_TOKEN`; the token is never stored in the browser.</p>
          <div className="flex gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 border border-cyan-300/20 bg-black/30 px-3 font-mono text-xs text-slate-400">
              <KeyRound size={14} />
              <input value={indexerToken} onChange={(event) => setIndexerToken(event.target.value)} placeholder="Indexer admin token" className="min-w-0 flex-1 bg-transparent text-slate-100 placeholder:text-slate-600" type="password" />
            </label>
            <button disabled={running || !indexerToken} onClick={runIndexer} className="flex items-center gap-2 border border-lime-300/25 bg-lime-300/8 px-3 font-mono text-xs text-lime-200 disabled:opacity-50">
              <Play size={14} />
              {running ? "Running" : "Run"}
            </button>
          </div>
          {indexerResult ? <pre className="mt-3 max-h-48 overflow-auto border border-slate-800 bg-black/30 p-3 text-xs text-slate-300 scrollbar-thin">{indexerResult}</pre> : null}
        </TerminalPanel>
        <TerminalPanel title="Indexer State">
          {overview?.indexerState.length ? (
            <DataTable columns={["ID", "Chain", "Last Block", "Updated"]} rows={overview.indexerState.map((state) => [state.id, state.chainId, state.lastProcessedBlock, formatDateTime(state.updatedAt)])} />
          ) : (
            <p className="text-sm text-slate-500">No indexer state yet. Configure RPC, contract addresses, and run the indexer after deployment.</p>
          )}
        </TerminalPanel>
      </div>

      <TerminalPanel title="Recent Indexed Events">
        {overview?.recentEvents.length ? (
          <DataTable columns={["Event", "Contract", "Block", "Tx"]} rows={overview.recentEvents.map((event) => [event.eventName, formatAddress(event.contractAddress), event.blockNumber, formatAddress(event.txHash)])} />
        ) : (
          <p className="text-sm text-slate-500">No indexed events yet.</p>
        )}
      </TerminalPanel>
    </div>
  );
}

function Line({ label, value, tone = "cyan" }: { label: string; value: string; tone?: "cyan" | "green" | "amber" }) {
  const color = tone === "green" ? "text-lime-300" : tone === "amber" ? "text-amber-300" : "text-cyan-200";
  return <div className="flex justify-between gap-3 border border-slate-800 bg-black/25 p-3"><span className="text-slate-500">{label}</span><span className={color}>{value}</span></div>;
}
