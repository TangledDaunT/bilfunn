import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { seal } from "./seal";
import { randomUUID } from "crypto";
export type Db = Prisma.TransactionClient;
export async function enqueue(
  kind: string,
  payload: Record<string, unknown>,
  key: string = randomUUID(),
  db: Db = prisma,
): Promise<import("@prisma/client").Outbox> {
  if (db === prisma)
    return prisma.$transaction((tx) => enqueue(kind, payload, key, tx));
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('outbox-capacity'))`;
  const existing = await db.outbox.findUnique({ where: { key } });
  if (existing) return existing;
  if (
    (await db.outbox.count({
      where: { status: { in: ["PENDING", "RUNNING"] } },
    })) >= 10000
  )
    throw new Error("Background queue at capacity");
  // All jobs carry a durable deduplication key. Sensitive payloads are encrypted at rest.
  return db.outbox.upsert({
    where: { key },
    update: {},
    create: {
      key,
      kind,
      userId: typeof payload.userId === "string" ? payload.userId : null,
      payload: { sealed: seal(JSON.stringify(payload)) },
    },
  });
}
/** Claim bounded leased work, retry failures with backoff, and erase successful sensitive payloads. */
export async function processJobs(limit = 20) {
  const { unseal } = await import("./seal");
  let processed = 0;
  const started = Date.now();
  for (let i = 0; i < Math.min(limit, 50); i++) {
    if (Date.now() - started > 35_000) break;
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        kind: string;
        key: string;
        payload: Prisma.JsonValue;
        attempts: number;
      }>
    >`
      UPDATE "Outbox" SET "status"='RUNNING', "attempts"="attempts"+1, "leaseUntil"=NOW()+INTERVAL '90 seconds'
      WHERE "id"=(SELECT "id" FROM "Outbox" WHERE (("status"='PENDING' AND "availableAt"<=NOW()) OR ("status"='RUNNING' AND "leaseUntil"<NOW())) AND "attempts"<8 ORDER BY "availableAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING "id", "kind", "key", "payload", "attempts"`;
    const job = rows[0];
    if (!job) break;
    try {
      const data = JSON.parse(
        unseal((job.payload as { sealed: string }).sealed),
      );
      if (job.kind === "email")
        await (await import("./email")).deliverEmail(data, job.key);
      else if (job.kind === "vehicle-refresh")
        await (
          await import("./vehicle/public-store")
        ).refreshVehicle(data.plate);
      else if (job.kind === "cancel")
        await (
          await import("./billing")
        ).reconcileCancellation(data.subscriptionId);
      else if (job.kind === "cache-purge")
        await (await import("./public-cache")).purgePublic(data.tags);
      else if (job.kind === "seo-reindex")
        await (await import("./seo-reindex")).reindex(data.after, data.version);
      else if (job.kind === "charge")
        await (
          await import("./billing")
        ).scheduleCharge(data.subscriptionId, data.due);
      else if (job.kind === "reconcile-page")
        await (
          await import("./payments/reconcile")
        ).reconciliationPage(data.after, data.run);
      else if (job.kind === "reconcile-checkout")
        await (
          await import("./payments/reconcile")
        ).reconcileCheckout(data.checkoutId, data.continuation);
      else if (job.kind === "reconcile-stripe-invoice")
        await (
          await import("./payments/reconcile")
        ).reconcileStripeInvoice(data.invoiceId, job.key, true);
      else if (job.kind === "reconcile-vipps-charge")
        await (
          await import("./payments/reconcile")
        ).reconcileVippsPayment(data.checkoutId, data.chargeId);
      else if (job.kind === "billing")
        await (await import("./billing")).runBillingCycle();
      else throw new Error("Unknown job type");
      await prisma.outbox.updateMany({
        where: { id: job.id, attempts: job.attempts, status: "RUNNING" },
        data: {
          status: "DONE",
          completedAt: new Date(),
          payload: {},
          leaseUntil: null,
          lastError: null,
        },
      });
      processed++;
    } catch {
      console.error(
        JSON.stringify({
          event: "job_failed",
          kind: job.kind,
          attempt: job.attempts,
          dead: job.attempts >= 8,
        }),
      );
      await prisma.outbox.updateMany({
        where: { id: job.id, attempts: job.attempts },
        data: {
          status: job.attempts >= 8 ? "DEAD" : "PENDING",
          lastError: "delivery_failed",
          leaseUntil: null,
          availableAt: new Date(
            Date.now() + Math.min(3600, 2 ** job.attempts * 10) * 1000,
          ),
        },
      });
    }
  }
  await prisma.outbox.updateMany({
    where: {
      status: "RUNNING",
      attempts: { gte: 8 },
      leaseUntil: { lt: new Date() },
    },
    data: { status: "DEAD", lastError: "lease_exhausted" },
  });
  return processed;
}
