import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return apiSuccess({ assets: [], disabled: true, phase: "Phase 2", reason: "Marketplace is disabled until the real task-validation-reward loop is stable." });
}
