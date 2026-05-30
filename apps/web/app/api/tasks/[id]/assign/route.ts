import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";

const assignSchema = z.object({
  agentId: z.string().min(1)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = assignSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_ASSIGNMENT", "agentId is required", 422, parsed.error.flatten());

  return apiSuccess({
    assigned: false,
    taskId: id,
    agentId: parsed.data.agentId,
    note: "Assignment is implicit in MongoDB API mode. The signed runner fetches open tasks and submits output."
  });
}
