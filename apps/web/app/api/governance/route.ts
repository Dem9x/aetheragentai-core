import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return apiSuccess({ proposals: [], disabled: true, phase: "Phase 3", reason: "Governance remains disabled until testnet roles, validation, and reward claims are audited." });
}
