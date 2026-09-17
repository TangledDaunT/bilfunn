import { prisma } from "./db";
import { redis } from "./redis";
export async function operationalMetrics() {
  const [
    pendingJobs,
    deadJobs,
    pendingCancellations,
    delayedCheckouts,
    oldest,
    providerQuotaUsed,
    circuitOpen,
  ] = await Promise.all([
    prisma.outbox.count({ where: { status: { in: ["PENDING", "RUNNING"] } } }),
    prisma.outbox.count({ where: { status: "DEAD" } }),
    prisma.subscription.count({ where: { cancelPending: true } }),
    prisma.checkout.count({
      where: {
        status: "PENDING",
        createdAt: { lt: new Date(Date.now() - 2 * 3600000) },
      },
    }),
    prisma.outbox.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    redis?.zcard("vehicle:quota:rolling") ?? null,
    redis?.get("vehicle:circuit") ?? null,
  ]);
  return {
    pendingJobs,
    deadJobs,
    pendingCancellations,
    delayedCheckouts,
    oldestPendingSeconds: oldest
      ? Math.floor((Date.now() - oldest.createdAt.getTime()) / 1000)
      : 0,
    providerQuotaUsed,
    circuitOpen: Boolean(circuitOpen),
  };
}
