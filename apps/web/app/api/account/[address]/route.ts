import { apiError, apiSuccess } from "@/lib/api/response";
import { listApiAgents, listApiRewards } from "@/lib/server/api-data";
import { addressSchema } from "@/server/api/schemas";

export async function GET(_: Request, { params }: { params: Promise<Record<string, string>> }) {
  const { address } = await params;
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) return apiError("INVALID_ADDRESS", "Invalid EVM address", 422);

  const normalized = address.toLowerCase();
  const [allAgents, allRewards] = await Promise.all([
    listApiAgents().catch(() => []),
    listApiRewards().catch(() => [])
  ]);
  const agents = allAgents.filter((agent: any) => String(agent.ownerAddress ?? "").toLowerCase() === normalized);
  const rewards = allRewards.filter((reward: any) => String(reward.recipientAddress ?? "").toLowerCase() === normalized);

  return apiSuccess({
    address: normalized,
    authenticated: false,
    userId: null,
    agents,
    submissions: [],
    rewards,
    indexedEvents: [],
    activity: [],
    safety: "rewards are protocol-based and not guaranteed"
  });
}
