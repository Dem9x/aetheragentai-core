import "server-only";

const buckets = new Map<string, { count: number; resetAt: number }>();

export type RateLimitPolicy = {
  limit?: number;
  windowMs?: number;
  critical?: boolean;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
  code?: string;
  message?: string;
};

function productionNeedsExternalLimiter(policy?: RateLimitPolicy) {
  return Boolean(
    policy?.critical &&
    process.env.NODE_ENV === "production" &&
    !process.env.REDIS_URL &&
    !process.env.UPSTASH_REDIS_REST_URL
  );
}

export const rateLimit = {
  check(key: string, policy: RateLimitPolicy = {}): RateLimitResult {
    if (productionNeedsExternalLimiter(policy)) {
      return {
        allowed: false,
        remaining: 0,
        code: "RATE_LIMIT_BACKEND_REQUIRED",
        message: "Production critical endpoints require REDIS_URL or UPSTASH_REDIS_REST_URL for shared rate limiting."
      };
    }
    return checkMemoryRateLimit(key, policy.limit ?? 20, policy.windowMs ?? 60_000);
  }
};

function checkMemoryRateLimit(key: string, limit = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

export function checkRateLimit(key: string, limit = 20, windowMs = 60_000): RateLimitResult {
  return rateLimit.check(key, { limit, windowMs });
}

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
