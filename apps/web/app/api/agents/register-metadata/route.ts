import { apiError, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { prisma } from "@/lib/server/prisma";
import { agentMetadataSchema } from "@/server/api/schemas";
import { getMetadataStorage } from "@/server/storage/metadata";

export async function POST(request: Request) {
  const rate = checkRateLimit(`agent-metadata:${getClientIp(request)}`, 20);
  if (!rate.allowed) return apiError("RATE_LIMITED", "Too many metadata writes", 429);

  const parsed = agentMetadataSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_AGENT_METADATA", "Invalid agent metadata", 422, parsed.error.flatten());

  const stored = await getMetadataStorage().put("agent", parsed.data);
  const agent = await prisma.agent.create({
    data: {
      ownerAddress: parsed.data.ownerAddress.toLowerCase(),
      metadataURI: stored.metadataURI,
      metadataHash: stored.metadataHash,
      name: parsed.data.name,
      agentType: parsed.data.agentType
    }
  });

  return apiSuccess({ agent, metadataURI: stored.metadataURI, metadataHash: stored.metadataHash }, { status: 201 });
}
