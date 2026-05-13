import { apiError, apiSuccess } from "@/lib/api/response";
import { databaseConfigured, prisma } from "@/lib/server/prisma";
import { readData } from "@/lib/server/datastore";
import { contractAddresses } from "@/lib/web3/contracts";

export async function GET(request: Request) {
  const configuredAdmins = (process.env.ADMIN_WALLET_ADDRESSES ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const requestedAddress = request.headers.get("x-wallet-address")?.toLowerCase();
  const isConfigured = configuredAdmins.length > 0;
  const isAdmin = Boolean(requestedAddress && configuredAdmins.includes(requestedAddress));

  const [dbStats, indexerState, recentEvents, fallback] = await Promise.all([
    Promise.all([
      prisma.agent.count().catch(() => 0),
      prisma.task.count().catch(() => 0),
      prisma.submission.count().catch(() => 0),
      prisma.validation.count().catch(() => 0),
      prisma.reward.count().catch(() => 0),
      prisma.indexedEvent.count().catch(() => 0)
    ]),
    prisma.indexerState.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }).catch(() => []),
    prisma.indexedEvent.findMany({ orderBy: { blockNumber: "desc" }, take: 20 }).catch(() => []),
    readData()
  ]);

  const [agents, tasks, submissions, validations, rewards, indexedEvents] = dbStats;
  if (isConfigured && requestedAddress && !isAdmin) {
    return apiError("ADMIN_WALLET_REQUIRED", "Connected wallet is not in ADMIN_WALLET_ADDRESSES", 403, {
      requestedAddress
    });
  }

  return apiSuccess({
    access: {
      configured: isConfigured,
      isAdmin,
      requestedAddress: requestedAddress ?? null,
      mode: isConfigured ? "allowlist" : "read_only_unconfigured"
    },
    contracts: contractAddresses,
    env: {
      chainName: process.env.NEXT_PUBLIC_CHAIN_NAME ?? "baseSepolia",
      chainId: process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532",
      hasRpc: Boolean(process.env.EVM_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
      hasIndexerToken: Boolean(process.env.INDEXER_ADMIN_TOKEN),
      hasValidatorSigner: Boolean(process.env.VALIDATOR_PRIVATE_KEY),
      databaseConfigured,
      metadataStorage: process.env.METADATA_STORAGE_PROVIDER ?? "local"
    },
    database: {
      agents,
      tasks,
      submissions,
      validations,
      rewards,
      indexedEvents
    },
    indexerState,
    recentEvents,
    fallbackActivity: fallback.activityLogs.slice(0, 10),
    safety: [
      "testnet only until audited",
      "rewards are protocol-based and not guaranteed",
      "AI validation can be imperfect",
      "do not use mainnet funds before audit"
    ]
  });
}
