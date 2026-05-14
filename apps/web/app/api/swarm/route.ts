import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return apiSuccess({ swarms: [], disabled: true, phase: "Phase 2", reason: "Swarm mining is disabled until single-agent validation is production-stable." });
}
