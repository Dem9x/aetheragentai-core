import { createPublicClient, http, type Address, type Log } from "viem";
import { prisma } from "@/lib/server/prisma";
import { logger } from "@/server/services/logger";
import { indexedEvents } from "@/server/indexer/abis";
import { getIndexerConfig } from "@/server/indexer/config";

function serializeLog(log: Log) {
  return JSON.parse(JSON.stringify(log, (_key, value) => (typeof value === "bigint" ? value.toString() : value)));
}

export async function runIndexerOnce() {
  const config = getIndexerConfig();
  if (!config.rpcUrl) throw new Error("EVM_RPC_URL or BASE_SEPOLIA_RPC_URL is required for indexer");

  const addresses = Object.values(config.contracts).filter(Boolean) as Address[];
  if (addresses.length === 0) {
    throw new Error(
      [
        "No contract addresses configured for indexer.",
        "Deploy contracts first, then set at least one NEXT_PUBLIC_*_ADDRESS in the web .env.",
        "Expected env keys: NEXT_PUBLIC_AAA_TOKEN_ADDRESS, NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS, NEXT_PUBLIC_TASK_BOARD_ADDRESS, NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS, NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS, NEXT_PUBLIC_STAKING_ADDRESS."
      ].join(" ")
    );
  }

  const client = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl)
  });

  const latestBlock = await client.getBlockNumber();
  const safeToBlock = latestBlock > BigInt(config.confirmations) ? latestBlock - BigInt(config.confirmations) : latestBlock;
  const stateId = `${config.chain.id}:default`;
  const state = await prisma.indexerState.upsert({
    where: { id: stateId },
    create: { id: stateId, chainId: config.chain.id, lastProcessedBlock: config.fromBlock },
    update: {}
  });

  const fromBlock = state.lastProcessedBlock + BigInt(1);
  if (fromBlock > safeToBlock) {
    logger.info({ latestBlock: latestBlock.toString(), safeToBlock: safeToBlock.toString() }, "indexer no-op");
    return { indexed: 0, fromBlock, toBlock: safeToBlock };
  }

  let indexed = 0;
  const maxRange = config.maxBlockRange > BigInt(0) ? config.maxBlockRange : BigInt(10);
  const maxChunks = Math.max(1, config.maxChunksPerRun);
  const cappedToBlock = minBlock(safeToBlock, fromBlock + maxRange * BigInt(maxChunks) - BigInt(1));
  let chunkFromBlock = fromBlock;
  let chunks = 0;

  while (chunkFromBlock <= cappedToBlock && chunks < maxChunks) {
    const chunkToBlock = minBlock(cappedToBlock, chunkFromBlock + maxRange - BigInt(1));
    for (const event of indexedEvents) {
      await sleep(config.requestDelayMs);
      const logs = await getLogsWithRetry(
        () => client.getLogs({
          address: addresses,
          event,
          fromBlock: chunkFromBlock,
          toBlock: chunkToBlock
        }),
        config.maxRetries,
        config.retryDelayMs
      );

      for (const log of logs) {
        await prisma.indexedEvent.upsert({
          where: {
            chainId_txHash_logIndex: {
              chainId: config.chain.id,
              txHash: log.transactionHash!,
              logIndex: log.logIndex!
            }
          },
          create: {
            chainId: config.chain.id,
            contractAddress: log.address.toLowerCase(),
            eventName: event.name,
            txHash: log.transactionHash!,
            logIndex: Number(log.logIndex),
            blockNumber: log.blockNumber!,
            blockHash: log.blockHash!,
            confirmed: true,
            payload: serializeLog(log)
          },
          update: {
            confirmed: true,
            payload: serializeLog(log)
          }
        });
        indexed += 1;
      }
    }
    chunks += 1;
    chunkFromBlock = chunkToBlock + BigInt(1);
  }

  await prisma.indexerState.update({
    where: { id: stateId },
    data: { lastProcessedBlock: cappedToBlock }
  });

  return { indexed, fromBlock, toBlock: cappedToBlock, safeToBlock, chunks, completed: cappedToBlock >= safeToBlock };
}

function minBlock(a: bigint, b: bigint) {
  return a < b ? a : b;
}

async function getLogsWithRetry<T>(request: () => Promise<T>, maxRetries: number, retryDelayMs: number) {
  let attempt = 0;
  while (true) {
    try {
      return await request();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = message.includes("compute units") || message.includes("rate limit") || message.includes("429") || message.includes("exceeded");
      if (!retryable || attempt >= maxRetries) throw error;
      await sleep(retryDelayMs * (attempt + 1));
      attempt += 1;
    }
  }
}

function sleep(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
