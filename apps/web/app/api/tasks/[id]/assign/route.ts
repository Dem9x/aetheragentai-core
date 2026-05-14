import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assignAgentToTask } from "@/lib/server/datastore";

const assignSchema = z.object({
  agentId: z.string().min(1)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = assignSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_ASSIGNMENT", "agentId is required", 422, parsed.error.flatten());

  try {
    const result = await assignAgentToTask(id, parsed.data.agentId);
    if (!result) return apiError("TASK_NOT_FOUND", "Task not found", 404, { id });
    return apiSuccess({ assigned: true, ...result });
  } catch (error) {
    return apiError("ASSIGN_FAILED", error instanceof Error ? error.message : "Unable to assign agent", 400);
  }
}
