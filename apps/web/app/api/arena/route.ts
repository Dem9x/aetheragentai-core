import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return apiSuccess({ matches: [], disabled: true, phase: "Phase 2", reason: "Arena is disabled until the core task economy is validated." });
}
