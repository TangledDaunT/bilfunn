import { Redis } from "@upstash/redis";
import { env } from "./env";
export const redis =
  env.redis.url && env.redis.token
    ? new Redis({
        url: env.redis.url,
        token: env.redis.token,
        retry: { retries: 1 },
        signal: () => AbortSignal.timeout(2000),
      })
    : null;
export async function distributedLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  if (!redis) throw new Error("Shared rate limiter unavailable");
  const script = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}`;
  const [count, ttl] = await redis.eval<number[], [number, number]>(
    script,
    [`limit:${key}`],
    [windowMs],
  );
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(Date.now() + Math.max(ttl, 0)),
  };
}
