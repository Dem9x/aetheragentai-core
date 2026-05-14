import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/server/prisma";
import { addressSchema } from "@/server/api/schemas";

export async function GET(_: Request, { params }: { params: Promise<Record<string, string>> }) {
  const { address } = await params;
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) return apiError("INVALID_ADDRESS", "Invalid EVM address", 422);

  const normalized = address.toLowerCase();
  const [wallet, agents, submissions, rewards, indexedEvents, activity] = await Promise.all([
    prisma.wallet.findUnique({ where: { address: normalized }, include: { user: true } }).catch(() => null),
    prisma.agent.findMany({ where: { ownerAddress: normalized }, orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    prisma.submission.findMany({ where: { submitterAddress: normalized }, orderBy: { createdAt: "desc" }, take: 50, include: { task: true } }).catch(() => []),
    prisma.reward.findMany({ where: { recipientAddress: normalized }, orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    prisma.indexedEvent.findMany({ where: { payload: { path: ["args", "owner"], equals: normalized } }, orderBy: { blockNumber: "desc" }, take: 25 }).catch(() => []),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }).catch(() => [])
  ]);

  return apiSuccess({
    address: normalized,
    authenticated: Boolean(wallet?.userId),
    userId: wallet?.userId ?? null,
    agents,
    submissions,
    rewards,
    indexedEvents,
    activity,
    safety: "rewards are protocol-based and not guaranteed"
  });
}
