"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ShieldCheck, Wallet } from "lucide-react";
import { SiweMessage } from "siwe";
import { formatEther } from "viem";
import { useAccount, useBalance, useChainId, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { DataTable, StatCard, StatusPill, TerminalPanel } from "@/components/shared/Primitives";
import { apiRequest } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils/format";
import { defaultChain, explorerTxUrl } from "@/lib/web3/chains";
import { formatAddress } from "@/lib/wallet";

type AccountData = {
  address: string;
  authenticated: boolean;
  userId: string | null;
  agents: Array<{ id: string; name: string; agentType: string; reputation: number; active: boolean; createdAt: string }>;
  submissions: Array<{ id: string; status: string; poiScore: string | null; createdAt: string; task?: { title: string } }>;
  rewards: Array<{ id: string; amount: string; status: string; txHash: string | null; createdAt: string }>;
  indexedEvents: Array<{ eventName: string; txHash: string; blockNumber: string }>;
  fallbackActivity: Array<{ id: string; type: string; message: string; timestamp: string; severity: string }>;
  safety: string;
};

export default function AccountPage() {
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { data: balance } = useBalance({ address });
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!address) {
      return;
    }
    let cancelled = false;
    apiRequest<AccountData>(`/api/account/${address}`)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load account");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  async function signIn() {
    if (!address) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const nonceData = await apiRequest<{ nonce: string; statement: string }>("/api/auth/nonce", {
        method: "POST",
        body: JSON.stringify({ address })
      });
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: nonceData.statement,
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce: nonceData.nonce
      }).prepareMessage();
      const signature = await signMessageAsync({ message });
      await apiRequest<{ authenticated: boolean }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ message, signature })
      });
      setLoading(true);
      const account = await apiRequest<AccountData>(`/api/account/${address}`);
      setData(account);
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
      setLoading(false);
    }
  }

  const claimable = useMemo(() => data?.rewards.filter((reward) => reward.status === "Claimable").length ?? 0, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl uppercase text-cyan-50">Account</h1>
          <p className="mt-1 text-sm text-slate-500">Wallet identity, registered agents, submissions, indexed activity, and reward records.</p>
        </div>
        <button
          onClick={() => {
            if (isConnected) disconnect();
            else if (connectors[0]) connect({ connector: connectors[0], chainId: defaultChain.id });
          }}
          className="flex items-center gap-2 border border-lime-300/25 bg-lime-300/8 px-3 py-2 font-mono text-xs text-lime-200"
        >
          <Wallet size={14} />
          {isPending ? "Connecting..." : isConnected ? "Disconnect" : "Connect Wallet"}
        </button>
      </div>

      {!isConnected || !address ? (
        <TerminalPanel title="Wallet Required">
          <p className="text-sm leading-7 text-slate-300">Connect an EVM wallet to view account-specific protocol data. Authentication for protected actions uses signed nonce login, not a plain wallet address.</p>
        </TerminalPanel>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-4">
            <StatCard label="Wallet" value={formatAddress(address)} />
            <StatCard label="Network" value={chain?.name ?? `Chain ${chainId}`} tone={chainId === defaultChain.id ? "green" : "amber"} />
            <StatCard label="Native Balance" value={`${balance ? Number(formatEther(balance.value)).toFixed(4) : "0.0000"} ${balance?.symbol ?? "ETH"}`} tone="violet" />
            <StatCard label="Claimable Records" value={claimable.toString()} tone="green" />
          </div>

          {chainId !== defaultChain.id ? (
            <div className="border border-amber-300/25 bg-amber-300/8 p-3 font-mono text-xs text-amber-200">Wrong network. Default development chain is {defaultChain.name}.</div>
          ) : null}
          {loading && !data ? <div className="border border-cyan-300/15 p-4 font-mono text-xs text-cyan-200">Loading account records...</div> : null}
          {error ? <div className="border border-rose-300/20 bg-rose-300/8 p-4 font-mono text-xs text-rose-200">{error}</div> : null}
          {authError ? <div className="border border-rose-300/20 bg-rose-300/8 p-4 font-mono text-xs text-rose-200">{authError}</div> : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <TerminalPanel
              title="Identity"
              action={!data?.authenticated ? (
                <button
                  onClick={signIn}
                  disabled={authLoading || chainId !== defaultChain.id}
                  className="inline-flex items-center gap-2 border border-lime-300/25 px-2 py-1 font-mono text-[10px] uppercase text-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck size={12} />
                  {authLoading ? "Signing" : "Sign In"}
                </button>
              ) : <StatusPill tone="green">Authenticated</StatusPill>}
            >
              <div className="grid gap-3 font-mono text-xs">
                <Row label="Address" value={address} />
                <Row label="Session" value={data?.authenticated ? "SIWE authenticated" : "not authenticated"} tone={data?.authenticated ? "green" : "amber"} />
                <Row label="User ID" value={data?.userId ?? "not linked"} />
                <Row label="Safety" value={data?.safety ?? "rewards are protocol-based and not guaranteed"} tone="amber" />
              </div>
              {!data?.authenticated ? (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Wallet connection only proves the browser can see your address. Sign the nonce message to create a backend session for protected actions.
                </p>
              ) : null}
            </TerminalPanel>
            <TerminalPanel title="Indexed Events">
              {data?.indexedEvents.length ? (
                <DataTable columns={["Event", "Block", "Tx"]} rows={data.indexedEvents.map((event) => [event.eventName, event.blockNumber, <TxLink key={event.txHash} txHash={event.txHash} chainId={chainId} />])} />
              ) : (
                <p className="text-sm text-slate-500">No indexed on-chain events for this wallet yet.</p>
              )}
            </TerminalPanel>
          </div>

          <TerminalPanel title="Owned Agents">
            {data?.agents.length ? (
              <DataTable columns={["Name", "Type", "Reputation", "Status", "Created"]} rows={data.agents.map((agent) => [agent.name, agent.agentType, agent.reputation, <StatusPill key={agent.id} tone={agent.active ? "green" : "red"}>{agent.active ? "Active" : "Inactive"}</StatusPill>, formatDateTime(agent.createdAt)])} />
            ) : (
              <p className="text-sm text-slate-500">No persisted agents for this wallet yet.</p>
            )}
          </TerminalPanel>

          <div className="grid gap-4 xl:grid-cols-2">
            <TerminalPanel title="Submissions">
              {data?.submissions.length ? (
                <DataTable columns={["Task", "Status", "PoI", "Created"]} rows={data.submissions.map((submission) => [submission.task?.title ?? submission.id, submission.status, submission.poiScore ?? "-", formatDateTime(submission.createdAt)])} />
              ) : (
                <p className="text-sm text-slate-500">No submissions found.</p>
              )}
            </TerminalPanel>
            <TerminalPanel title="Reward Records">
              {data?.rewards.length ? (
                <DataTable columns={["Amount", "Status", "Tx", "Created"]} rows={data.rewards.map((reward) => [reward.amount, reward.status, reward.txHash ? <TxLink key={reward.id} txHash={reward.txHash} chainId={chainId} /> : "-", formatDateTime(reward.createdAt)])} />
              ) : (
                <p className="text-sm text-slate-500">No reward records found. rewards are protocol-based and not guaranteed.</p>
              )}
            </TerminalPanel>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, tone = "cyan" }: { label: string; value: string; tone?: "cyan" | "green" | "amber" }) {
  const color = tone === "green" ? "text-lime-300" : tone === "amber" ? "text-amber-300" : "text-cyan-200";
  return <div className="flex items-center justify-between gap-3 border border-slate-800 bg-black/25 p-3"><span className="text-slate-500">{label}</span><span className={color}>{value}</span></div>;
}

function TxLink({ txHash, chainId }: { txHash: string; chainId: number }) {
  const href = explorerTxUrl(chainId, txHash);
  if (!href) return <span>{formatAddress(txHash)}</span>;
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-200 hover:text-cyan-100">{formatAddress(txHash)}<ExternalLink size={12} /></a>;
}
