import { prisma } from "./db";
import { distributedLimit, redis } from "./redis";
import { HttpError } from "./http";
/** Raise a retryable 429 using the remaining shared window, rather than a generic fixed delay. */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const result = await rateLimit(key, limit, windowMs);
  if (!result.ok)
    throw new HttpError(
      429,
      "too_many_attempts",
      Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)),
    );
  return result;
}
/** Count attempts atomically; Redis is mandatory in production and PostgreSQL is only the local fallback. */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  if (redis) return distributedLimit(key, limit, windowMs);
  if (process.env.NODE_ENV === "production")
    throw new Error("Shared rate limiter unavailable");
  const [row] = await prisma.$queryRaw<
    Array<{ count: number; windowEnd: Date }>
  >`
    INSERT INTO "RateLimit" ("key", "count", "windowEnd", "updatedAt") VALUES (${key}, 1, NOW() + ${windowMs} * INTERVAL '1 millisecond', NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowEnd" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowEnd" = CASE WHEN "RateLimit"."windowEnd" <= NOW() THEN NOW() + ${windowMs} * INTERVAL '1 millisecond' ELSE "RateLimit"."windowEnd" END, "updatedAt" = NOW()
    RETURNING "count", "windowEnd"`;
  return {
    ok: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    resetAt: row.windowEnd,
  };
}
export async function pruneRateLimits() {
  await prisma.rateLimit.deleteMany({
    where: { windowEnd: { lt: new Date() } },
  });
}
