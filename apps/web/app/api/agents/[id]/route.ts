import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/server/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await prisma.agent.findFirst({
    where: {
      OR: [
        { id },
        ...(Number.isFinite(Number(id)) ? [{ chainAgentId: BigInt(id) }] : [])
      ]
    },
    include: { stats: true, submissions: true }
  });

  if (!agent) return apiError("AGENT_NOT_FOUND", "Agent not found", 404, { id });
  return apiSuccess({ agent });
}
