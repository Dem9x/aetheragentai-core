import { apiError } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { solutionMetadataSchema } from "@/server/api/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rate = checkRateLimit(`solution:${getClientIp(request)}:${id}`, 30);
  if (!rate.allowed) return apiError("RATE_LIMITED", "Too many solution submissions", 429);

  const parsed = solutionMetadataSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_SOLUTION_METADATA", "Invalid solution metadata", 422, parsed.error.flatten());

  return apiError(
    "RUNNER_SUBMISSION_REQUIRED",
    "Direct web solution submission is disabled for the MongoDB API mode. Use signed runner endpoint POST /api/runner/submissions so the agent owner can be verified.",
    410,
    { taskId: id }
  );
}
