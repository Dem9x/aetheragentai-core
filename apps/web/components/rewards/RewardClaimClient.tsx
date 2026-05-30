"use client";

import { useMemo } from "react";
import { ExternalLink, WalletCards } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { StatCard, TerminalPanel } from "@/components/shared/Primitives";
import { contractAddresses, rewardDistributorAbi } from "@/lib/web3/contracts";

function explorerTxUrl(hash?: `0x${string}`) {
  if (!hash) return "";
  const base = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || "https://sepolia.basescan.org";
  return `${base.replace(/\/$/, "")}/tx/${hash}`;
}

export function RewardClaimClient() {
  const { address, isConnected } = useAccount();
  const configured = Boolean(contractAddresses.rewardDistributor);
  const { data: pendingRaw, refetch } = useReadContract({
    abi: rewardDistributorAbi,
    address: contractAddresses.rewardDistributor,
    functionName: "pendingRewards",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && configured) }
  });
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const pending = useMemo(() => pendingRaw ? formatUnits(pendingRaw, 18) : "0", [pendingRaw]);

  async function claim() {
    if (!contractAddresses.rewardDistributor) return;
    writeContract({
      abi: rewardDistributorAbi,
      address: contractAddresses.rewardDistributor,
      functionName: "claim"
    }, {
      onSuccess: () => {
        setTimeout(() => refetch(), 1500);
      }
    });
  }

  return (
    <TerminalPanel title="On-Chain Reward Claim">
      <div className="grid gap-2 md:grid-cols-3">
        <StatCard label="Wallet" value={isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "not connected"} />
        <StatCard label="Contract" value={configured ? "configured" : "missing"} tone={configured ? "green" : "amber"} />
        <StatCard label="Pending On-Chain" value={`${pending} AAA`} tone="green" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button disabled={!isConnected || !configured || pending === "0" || isPending || confirming} onClick={claim} className="flex items-center gap-2 border border-lime-300/25 bg-lime-300/8 px-3 py-2 font-mono text-xs text-lime-200 disabled:opacity-50">
          <WalletCards size={14} />
          {isPending ? "Wallet Pending" : confirming ? "Confirming" : "Claim On-Chain"}
        </button>
        {hash ? <a href={explorerTxUrl(hash)} target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-cyan-300/20 px-3 py-2 font-mono text-xs text-cyan-200"><ExternalLink size={14} />Explorer</a> : null}
      </div>
      {isSuccess ? <p className="mt-3 font-mono text-xs text-lime-300">Claim transaction confirmed. Indexed reward state may update after the indexer catches up.</p> : null}
      {error ? <p className="mt-3 font-mono text-xs text-rose-300">{error.message}</p> : null}
      <p className="mt-3 text-xs leading-5 text-slate-500">Rewards are protocol-based and not guaranteed. Testnet only until audited.</p>
    </TerminalPanel>
  );
}
