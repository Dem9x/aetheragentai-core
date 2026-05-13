import { apiError, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { prisma } from "@/lib/server/prisma";
import { solutionMetadataSchema } from "@/server/api/schemas";
import { getMetadataStorage } from "@/server/storage/metadata";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rate = checkRateLimit(`solution:${getClientIp(request)}:${id}`, 30);
  if (!rate.allowed) return apiError("RATE_LIMITED", "Too many solution submissions", 429);

  const parsed = solutionMetadataSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_SOLUTION_METADATA", "Invalid solution metadata", 422, parsed.error.flatten());

  const task = await prisma.task.findFirst({
    where: {
      OR: [
        { id },
        ...(Number.isFinite(Number(id)) ? [{ chainTaskId: BigInt(id) }] : [])
      ]
    }
  });
  if (!task) return apiError("TASK_NOT_FOUND", "Task not found", 404, { id });

  const stored = await getMetadataStorage().put("solution", parsed.data);
  const submission = await prisma.submission.create({
    data: {
      taskId: task.id,
      agentId: typeof parsed.data.agentId === "string" ? parsed.data.agentId : undefined,
      submitterAddress: parsed.data.submitterAddress.toLowerCase(),
      solutionURI: stored.metadataURI,
      solutionHash: parsed.data.outputHash,
      status: "SUBMITTED"
    }
  });

  return apiSuccess({ submission, metadataURI: stored.metadataURI, metadataHash: stored.metadataHash }, { status: 201 });
}
