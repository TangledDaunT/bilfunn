export const dynamic = "force-dynamic";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { safeEqual } from "@/lib/crypto";
import { endpoint, HttpError } from "@/lib/http";
import { publishWorker } from "@/lib/wake-worker";
export const runtime = "nodejs";
export const maxDuration = 60;
export const GET = endpoint(async (req) => {
  if (
    !env.cronSecret ||
    !safeEqual(
      req.headers.get("authorization") || "",
      `Bearer ${env.cronSecret}`,
    )
  )
    throw new HttpError(401, "unauthorized");
  if (!env.qstash.token) throw new HttpError(503, "queue_not_configured");
  await enqueue("billing", {}, `billing:${Math.floor(Date.now() / 600_000)}`);
  const run = String(Math.floor(Date.now() / 3600000));
  await enqueue(
    "reconcile-page",
    { after: "", run },
    `reconcile-page:${run}:start`,
  );
  const refresh = await prisma.publicVehicle.findMany({
    where: {
      refreshAfter: { lte: new Date() },
      suppressed: false,
      gone: false,
    },
    orderBy: [{ refreshAfter: "asc" }, { plate: "asc" }],
    take: 100,
  });
  for (const row of refresh)
    await enqueue(
      "vehicle-refresh",
      { plate: row.plate },
      `scheduled-refresh:${row.plate}:${Math.floor(Date.now() / 3600_000)}`,
    );
  await prisma.publicVehicle.updateMany({
    where: { expiresAt: { lte: new Date() }, suppressed: false, gone: false },
    data: { data: {}, eligible: false },
  });
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.loginToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await prisma.outbox.deleteMany({
    where: {
      status: "DONE",
      completedAt: { lt: new Date(Date.now() - 30 * 86400_000) },
    },
  });
  await prisma.outbox.updateMany({
    where: {
      kind: "email",
      status: "DEAD",
      createdAt: { lt: new Date(Date.now() - 86400_000) },
    },
    data: { payload: {} },
  });
  const count = await prisma.outbox.count({
    where: { status: "PENDING", availableAt: { lte: new Date() } },
  });
  // The minute dispatcher retries wakeups for durably queued work.
  if (count) await publishWorker();
  const metrics = await (await import("@/lib/operations")).operationalMetrics();
  if (
    metrics.deadJobs ||
    metrics.delayedCheckouts ||
    metrics.oldestPendingSeconds > 120 ||
    metrics.circuitOpen
  )
    console.error(JSON.stringify({ event: "operations_alert", ...metrics }));
  return Response.json({ ok: true, queued: count });
});
