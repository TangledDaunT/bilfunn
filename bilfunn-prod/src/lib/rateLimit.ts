import { prisma } from "./db";

/**
 * Fixed-window limiter backed by Postgres. Good enough at MVP volume and one less
 * service to run. If search traffic grows past a few requests/second, move this to
 * Upstash Redis — the call signature stays the same.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const existing = await prisma.rateLimit.findUnique({ where: { key } });

  if (!existing || existing.windowEnd < now) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowEnd: new Date(now.getTime() + windowMs) },
      update: { count: 1, windowEnd: new Date(now.getTime() + windowMs) },
    });
    return { ok: true, remaining: limit - 1, resetAt: new Date(now.getTime() + windowMs) };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.windowEnd };
  }

  const updated = await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return { ok: true, remaining: Math.max(0, limit - updated.count), resetAt: existing.windowEnd };
}

export async function pruneRateLimits() {
  await prisma.rateLimit.deleteMany({ where: { windowEnd: { lt: new Date(Date.now() - 3600_000) } } });
}
