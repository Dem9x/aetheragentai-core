"use client";

import { QueryClient } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { defaultChain, supportedChains } from "@/lib/web3/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

export const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected(),
    coinbaseWallet({ appName: "AetherAgentAI" }),
    ...(walletConnectProjectId ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })] : [])
  ],
  transports: {
    [defaultChain.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
    8453: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    42161: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
    43114: http(process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL),
    56: http(process.env.NEXT_PUBLIC_BSC_RPC_URL),
    1: http(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL)
  },
  ssr: true
});
