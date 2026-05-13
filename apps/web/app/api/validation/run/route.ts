import { apiError, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { validationRunSchema } from "@/server/api/schemas";
import { runValidation } from "@/server/validation/engine";

export async function POST(request: Request) {
  const rate = checkRateLimit(`validation:${getClientIp(request)}`, 30);
  if (!rate.allowed) return apiError("RATE_LIMITED", "Too many validation requests", 429);

  const parsed = validationRunSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("INVALID_VALIDATION_INPUT", "Invalid validation input", 422, parsed.error.flatten());

  return apiSuccess(runValidation(parsed.data));
}
