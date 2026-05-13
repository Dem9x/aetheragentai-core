import { base, baseSepolia, arbitrum, avalanche, bsc, mainnet } from "viem/chains";

export const supportedChains = {
  baseSepolia,
  base,
  arbitrum,
  avalanche,
  bsc,
  mainnet
};

export type SupportedChainName = keyof typeof supportedChains;

export function getIndexerConfig() {
  const chainName = (process.env.NEXT_PUBLIC_CHAIN_NAME ?? "baseSepolia") as SupportedChainName;
  const chain = supportedChains[chainName] ?? baseSepolia;

  return {
    chain,
    rpcUrl: process.env.EVM_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "",
    confirmations: Number(process.env.INDEXER_CONFIRMATIONS ?? 8),
    fromBlock: BigInt(process.env.INDEXER_FROM_BLOCK ?? 0),
    contracts: {
      agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS,
      taskBoard: process.env.NEXT_PUBLIC_TASK_BOARD_ADDRESS,
      validationRegistry: process.env.NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS,
      rewardDistributor: process.env.NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS,
      staking: process.env.NEXT_PUBLIC_STAKING_ADDRESS,
      aaaToken: process.env.NEXT_PUBLIC_AAA_TOKEN_ADDRESS
    }
  };
}
