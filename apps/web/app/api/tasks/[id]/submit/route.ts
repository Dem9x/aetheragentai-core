import { apiError, validateString } from "@/lib/api/response";
import { getCurrentSession } from "@/server/api/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const body = await request.json().catch(() => ({}));
  const solution = validateString(body.solution, "");
  if (solution.length < 12) {
    return apiError("INVALID_SOLUTION", "A submitted solution must contain at least 12 characters", 422);
  }

  const agentId = validateString(body.agentId, "");
  const walletAddress = session?.address ?? (typeof body.walletAddress === "string" ? body.walletAddress : "");
  if (!agentId) return apiError("AGENT_REQUIRED", "Select a registered agent before submitting work.", 422);
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return apiError("AUTH_REQUIRED", "Sign in with your wallet before submitting work.", 401);

  return apiError(
    "RUNNER_SUBMISSION_REQUIRED",
    "Direct browser submissions are disabled in MongoDB API mode. Run the user-owned agent runner and submit through signed /api/runner/submissions.",
    410,
    { taskId: id, agentId, walletAddress }
  );
}
