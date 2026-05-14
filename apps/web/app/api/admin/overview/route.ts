import { apiError, apiSuccess } from "@/lib/api/response";
import { databaseConfigured, prisma } from "@/lib/server/prisma";
import { contractAddresses } from "@/lib/web3/contracts";
import { requireAdminSession } from "@/server/api/admin";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin.configured) {
    return apiError("ADMIN_NOT_CONFIGURED", "Set ADMIN_WALLET_ADDRESSES before using the admin console.", 403);
  }
  if (!admin.session) {
    return apiError("AUTH_REQUIRED", "Sign in with an admin wallet before opening the admin console.", 401);
  }
  if (!admin.ok) {
    return apiError("ADMIN_WALLET_REQUIRED", "Connected wallet is not in ADMIN_WALLET_ADDRESSES", 403, {
      requestedAddress: admin.session.address
    });
  }

  const [dbStats, indexerState, recentEvents, activity] = await Promise.all([
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
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }).catch(() => [])
  ]);

  const [agents, tasks, submissions, validations, rewards, indexedEvents] = dbStats;

  return apiSuccess({
    access: {
      configured: admin.configured,
      isAdmin: admin.isAdmin,
      requestedAddress: admin.session.address,
      mode: "allowlist_session"
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
    activity,
    safety: [
      "testnet only until audited",
      "rewards are protocol-based and not guaranteed",
      "AI validation can be imperfect",
      "do not use mainnet funds before audit"
    ]
  });
}
