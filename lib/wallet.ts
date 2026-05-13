"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type WalletState = {
  connected: boolean;
  address: string;
  nativeBalance: string;
  chainId: string;
  network: string;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => void;
};

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function weiHexToEth(hexValue: string) {
  const wei = BigInt(hexValue);
  const ethUnit = BigInt(10) ** BigInt(18);
  const whole = wei / ethUnit;
  const fraction = (wei % ethUnit).toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fraction}`;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      connected: false,
      address: "",
      nativeBalance: "0.0000",
      chainId: "",
      network: process.env.NEXT_PUBLIC_NETWORK_LABEL ?? "Browser Wallet",
      error: "",
      connect: async () => {
        if (typeof window === "undefined" || !window.ethereum) {
          set({ error: "No EIP-1193 wallet detected. Install MetaMask, Rabby, or another browser wallet." });
          return;
        }

        try {
          const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
          const chainId = (await window.ethereum.request({ method: "eth_chainId" })) as string;
          const address = accounts[0];
          const balanceHex = (await window.ethereum.request({ method: "eth_getBalance", params: [address, "latest"] })) as string;

          set({
            connected: true,
            address,
            nativeBalance: weiHexToEth(balanceHex),
            chainId,
            network: `Chain ${Number.parseInt(chainId, 16)}`,
            error: ""
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Wallet connection rejected" });
        }
      },
      disconnect: () => set({ connected: false, address: "", nativeBalance: "0.0000", chainId: "" })
    }),
    {
      name: "aaa-wallet",
      partialize: (state) => ({
        connected: state.connected,
        address: state.address,
        nativeBalance: state.nativeBalance,
        chainId: state.chainId,
        network: state.network,
        error: state.error
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.connected && state.address) {
          state.network = state.chainId ? `Chain ${Number.parseInt(state.chainId, 16)}` : state.network;
        }
      }
    }
  )
);

export { formatAddress };
