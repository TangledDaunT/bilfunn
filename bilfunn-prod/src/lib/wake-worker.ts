import { env } from "./env";
import { redis } from "./redis";
export async function wakeWorker() {
  if (!env.qstash.token) return;
  try {
    if (redis && !(await redis.set("outbox:wake", "1", { nx: true, ex: 1 })))
      return;
    await publishWorker();
  } catch {
    console.error(
      JSON.stringify({ event: "queue_wakeup_failed", severity: "error" }),
    );
  }
}

export async function publishWorker() {
  if (!env.qstash.token) throw new Error("Queue disabled");
  const response = await fetch(
    `https://qstash.upstash.io/v2/publish/${env.baseUrl}/api/jobs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.qstash.token}`,
        "Content-Type": "application/json",
        "Upstash-Retries": "3",
        "Upstash-Timeout": "55s",
        "Upstash-Flow-Control-Key": "outbox-workers",
        "Upstash-Flow-Control-Value": "parallelism=10, rate=20, period=1s",
      },
      body: "{}",
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Queue dispatch failed");
}
