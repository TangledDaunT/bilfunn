import { randomUUID } from "crypto";
import { redis } from "../redis";
import { env } from "../env";
import { rateLimit } from "../rateLimit";
export async function takeProviderQuota(background = false) {
  const quota = env.svv.dailyQuota;
  if (!Number.isSafeInteger(quota) || quota <= 0) return false;
  if (redis && (await redis.get("vehicle:circuit"))) return false;
  // Rolling 24-hour window is conservative across provider timezone boundaries.
  const maximum = background ? Math.floor(quota * 0.8) : quota;
  if (redis) {
    const script = `redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[2]-86400000); if redis.call('ZCARD',KEYS[1])>=tonumber(ARGV[1]) then return 0 end; redis.call('ZADD',KEYS[1],ARGV[2],ARGV[3]); redis.call('PEXPIRE',KEYS[1],86400000); return 1`;
    return Boolean(
      await redis.eval(
        script,
        ["vehicle:quota:rolling"],
        [maximum, Date.now(), randomUUID()],
      ),
    );
  }
  return (await rateLimit("vehicle:quota", maximum, 86400_000)).ok;
}
export async function providerFailure() {
  if (!redis) return;
  const result = await redis.incr("vehicle:failures");
  if (result === 1) await redis.expire("vehicle:failures", 60);
  if (result >= 5) await redis.set("vehicle:circuit", true, { ex: 60 });
}

export async function providerLease(
  background: boolean,
): Promise<(() => Promise<void>) | null> {
  if (!redis) return async () => {};
  const token = randomUUID();
  const claimed = await redis.eval(
    `redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1]); if redis.call('ZCARD',KEYS[1])>=tonumber(ARGV[2]) then return 0 end; redis.call('ZADD',KEYS[1],ARGV[1]+30000,ARGV[3]); redis.call('PEXPIRE',KEYS[1],30000); return 1`,
    ["vehicle:inflight"],
    [Date.now(), background ? 8 : 10, token],
  );
  return claimed
    ? async () => {
        await redis?.zrem("vehicle:inflight", token);
      }
    : null;
}
