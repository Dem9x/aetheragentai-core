import { base, baseSepolia, arbitrum, avalanche, bsc, mainnet } from "wagmi/chains";

export const supportedChains = [baseSepolia, base, arbitrum, avalanche, bsc, mainnet] as const;

export const defaultChain = baseSepolia;

export function explorerTxUrl(chainId: number, txHash: string) {
  const chain = supportedChains.find((item) => item.id === chainId);
  const explorer = chain?.blockExplorers?.default.url;
  return explorer ? `${explorer}/tx/${txHash}` : undefined;
}
