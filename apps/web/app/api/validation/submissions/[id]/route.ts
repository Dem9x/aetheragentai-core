import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { apiBackendUnavailable, proxyToAetherApi } from "@/lib/server/aether-api";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";
import { requireValidatorSession } from "@/server/api/validator";

const validationSubmitSchema = z.object({
  score: z.number().int().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  reason: z.string().min(8).max(2000),
  formatPass: z.boolean().default(true),
  safetyPass: z.boolean().default(true),
  resultURI: z.string().min(4).max(500).optional(),
  resultHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = rateLimit.check(`validation-submit:${getClientIp(request)}:${id}`, { limit: 20, windowMs: 60_000, critical: true });
  if (!limited.allowed) return apiError(limited.code ?? "RATE_LIMITED", limited.message ?? "Too many validation submissions", limited.code ? 503 : 429);

  const auth = await requireValidatorSession();
  if (!auth.configured) return apiError("VALIDATOR_NOT_CONFIGURED", "Set VALIDATOR_WALLET_ADDRESSES or ADMIN_WALLET_ADDRESSES before submitting validation.", 403);
  if (!auth.session) return apiError("AUTH_REQUIRED", "Sign in with a validator wallet before submitting validation.", 401);
  if (!auth.ok) return apiError("VALIDATOR_ROLE_REQUIRED", "Connected wallet is not authorized as validator.", 403);

  const parsed = validationSubmitSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_VALIDATION", "Invalid validation payload", 422, parsed.error.flatten());

  try {
    return await proxyToAetherApi(request, "/validations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-validator-address": auth.session.address
      },
      body: JSON.stringify({ ...parsed.data, submissionId: id, validatorAddress: auth.session.address })
    });
  } catch (error) {
    return apiBackendUnavailable(error);
  }
}
