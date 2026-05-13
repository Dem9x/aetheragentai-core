import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { runIndexerOnce } from "@/server/indexer/indexer";
import { logger } from "@/server/services/logger";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

export const indexerQueue = new Queue("aaa-indexer", { connection });

export function startIndexerWorker() {
  return new Worker(
    "aaa-indexer",
    async () => runIndexerOnce(),
    { connection }
  ).on("failed", (_job, error) => {
    logger.error({ error }, "indexer job failed");
  });
}
