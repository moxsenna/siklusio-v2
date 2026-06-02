type Clock = () => number;

export interface RateLimitRule {
  name: "ai" | "checkout" | "webhook" | string;
  max: number;
  windowMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

export interface MemoryRateLimiterOptions {
  now?: Clock;
  store?: Map<string, RateLimitBucket>;
}

const AI_PATHS = new Set([
  "/api/generate-recipes",
  "/api/generate-cycle-report",
  "/api/generate-habits-insight",
  "/api/generate-calming-reassurance",
  "/api/habit-coach/generate",
  "/api/cycle-guide/generate",
]);

const CHECKOUT_PATHS = new Set([
  "/api/checkout/register",
  "/api/checkout/topup",
]);

const DEFAULT_RULES = {
  ai: { max: 20, windowSeconds: 60 },
  checkout: { max: 10, windowSeconds: 300 },
  webhook: { max: 120, windowSeconds: 60 },
};

const parsePositiveInteger = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const buildRule = (
  name: RateLimitRule["name"],
  maxValue: unknown,
  windowValue: unknown,
  fallback: { max: number; windowSeconds: number }
): RateLimitRule => ({
  name,
  max: parsePositiveInteger(maxValue, fallback.max),
  windowMs: parsePositiveInteger(windowValue, fallback.windowSeconds) * 1000,
});

export const resolveRateLimitRule = (
  method: string,
  pathname: string,
  env: Record<string, unknown> = {}
): RateLimitRule | null => {
  if (method.toUpperCase() !== "POST") {
    return null;
  }

  if (AI_PATHS.has(pathname)) {
    return buildRule(
      "ai",
      env.AI_RATE_LIMIT_MAX,
      env.AI_RATE_LIMIT_WINDOW_SECONDS,
      DEFAULT_RULES.ai
    );
  }

  if (CHECKOUT_PATHS.has(pathname)) {
    return buildRule(
      "checkout",
      env.CHECKOUT_RATE_LIMIT_MAX,
      env.CHECKOUT_RATE_LIMIT_WINDOW_SECONDS,
      DEFAULT_RULES.checkout
    );
  }

  if (pathname === "/api/payment/webhook") {
    return buildRule(
      "webhook",
      env.WEBHOOK_RATE_LIMIT_MAX,
      env.WEBHOOK_RATE_LIMIT_WINDOW_SECONDS,
      DEFAULT_RULES.webhook
    );
  }

  return null;
};

export const createMemoryRateLimiter = (options: MemoryRateLimiterOptions = {}) => {
  const now = options.now || Date.now;
  const store = options.store || new Map<string, RateLimitBucket>();
  let checksSinceCleanup = 0;

  const cleanupExpired = (currentTime: number) => {
    for (const [key, bucket] of store.entries()) {
      if (currentTime >= bucket.resetAt) {
        store.delete(key);
      }
    }
  };

  return {
    check(key: string, rule: RateLimitRule): RateLimitResult {
      const currentTime = now();
      checksSinceCleanup += 1;
      if (checksSinceCleanup >= 500) {
        cleanupExpired(currentTime);
        checksSinceCleanup = 0;
      }

      const existing = store.get(key);
      if (!existing || currentTime >= existing.resetAt) {
        const resetAt = currentTime + rule.windowMs;
        store.set(key, { count: 1, resetAt });
        return {
          allowed: true,
          remaining: Math.max(0, rule.max - 1),
          resetAt,
        };
      }

      if (existing.count >= rule.max) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: existing.resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: Math.max(0, rule.max - existing.count),
        resetAt: existing.resetAt,
      };
    },
  };
};

const hashIdentity = (value: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const getClientIp = (c: any): string => {
  const forwardedFor = c.req.header("x-forwarded-for") || "";
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim();
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-real-ip") ||
    firstForwardedIp ||
    "unknown"
  );
};

const getClientIdentity = (c: any): string => {
  const authHeader = c.req.header("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return `auth:${hashIdentity(authHeader.slice("Bearer ".length))}`;
  }

  return `ip:${getClientIp(c)}`;
};

const sharedLimiter = createMemoryRateLimiter();

export const createRateLimitMiddleware =
  (limiter = sharedLimiter) =>
  async (c: any, next: () => Promise<void>) => {
    const pathname = new URL(c.req.url).pathname;
    const rule = resolveRateLimitRule(c.req.method, pathname, c.env || {});

    if (!rule) {
      return next();
    }

    const key = `${rule.name}:${getClientIdentity(c)}`;
    const result = limiter.check(key, rule);
    const resetSeconds = Math.ceil(result.resetAt / 1000);

    c.header("X-RateLimit-Limit", String(rule.max));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(resetSeconds));

    if (!result.allowed) {
      c.header("Retry-After", String(result.retryAfterSeconds));
      return c.json({
        error: "Terlalu banyak permintaan. Coba lagi sebentar lagi.",
        retryAfterSeconds: result.retryAfterSeconds,
      }, 429);
    }

    return next();
  };
