import { type Subscription, type User } from "@prisma/client";
import { prisma } from "./db";
import { getConfig } from "./config";
import { providerFor } from "./payments";
import { enqueue } from "./jobs";
import { HttpError } from "./http";
export function hasAccess(
  sub: Subscription | null | undefined,
  cancelKeepsAccess = true,
) {
  if (!sub) return false;
  if (
    ["ACTIVE", "TRIALING"].includes(sub.status) ||
    (sub.status === "CANCELED" && cancelKeepsAccess)
  )
    return sub.periodEnd.getTime() > Date.now();
  return (
    sub.status === "PAST_DUE" &&
    Boolean(sub.graceUntil && sub.graceUntil.getTime() > Date.now())
  );
}
/** Record cancellation intent and its outbox work atomically; provider confirmation may arrive later. */
export async function cancelSubscription(
  sub: Subscription,
  user: User,
  reason?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sub.id}))`;
    const current = await tx.subscription.findUniqueOrThrow({
      where: { id: sub.id },
    });
    if (current.canceledAt) return current;
    const updated = await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        cancelAt: current.periodEnd,
        cancelReason: reason,
        cancelPending: true,
      },
    });
    await enqueue("cancel", { subscriptionId: sub.id }, `cancel:${sub.id}`, tx);
    return updated;
  });
}
export async function reconcileCancellation(id: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!sub?.cancelPending) return;
  await providerFor(sub.provider).cancel({
    subscriptionId: sub.providerSubscriptionId,
    agreementId: sub.providerAgreementId,
  });
  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id },
      data: { cancelPending: false },
    });
    if (!sub.user.deletedAt)
      await enqueue(
        "email",
        {
          type: "cancellation",
          to: sub.user.email,
          userId: sub.userId,
          ctx: { until: sub.periodEnd.toISOString() },
        },
        `cancel-mail:${id}`,
        tx,
      );
  });
}
export async function searchAllowance(
  _userId: string,
  sub: Subscription | null,
) {
  const cfg = await getConfig();
  const limit =
    sub?.status === "TRIALING" ? cfg.introSearchLimit : cfg.monthlySearchLimit;
  const used = sub?.searchesThisPeriod ?? 0;
  return { limit, used, left: Math.max(0, limit - used) };
}
/** Recheck entitlement and quota under a subscription lock; concurrent requests cannot spend the same remaining allowance. */
export async function consumeSearch(
  userId: string,
  sub: Subscription,
  plate: string,
) {
  const cfg = await getConfig();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sub.id}))`;
    const current = await tx.subscription.findUnique({ where: { id: sub.id } });
    if (
      !current ||
      current.userId !== userId ||
      !hasAccess(current, cfg.cancelKeepsAccess)
    )
      throw new HttpError(403, "access_expired");
    if (
      !cfg.duplicatesCount &&
      (await tx.search.findFirst({
        where: {
          userId,
          plate,
          counted: true,
          createdAt: {
            gte: new Date(
              Math.max(current.periodStart.getTime(), Date.now() - 86400_000),
            ),
          },
        },
      }))
    )
      return false;
    const limit =
      current.status === "TRIALING"
        ? cfg.introSearchLimit
        : cfg.monthlySearchLimit;
    const claimed = await tx.subscription.updateMany({
      where: { id: sub.id, searchesThisPeriod: { lt: limit } },
      data: { searchesThisPeriod: { increment: 1 } },
    });
    if (!claimed.count) throw new HttpError(429, "search_allowance_exhausted");
    await tx.search.create({
      data: { userId, plate, counted: true, result: "FOUND" },
    });
    return true;
  });
}
export async function runBillingCycle() {
  const cfg = await getConfig();
  const now = new Date();
  const due = await prisma.$queryRaw<
    Subscription[]
  >`SELECT * FROM "Subscription" WHERE "provider"='VIPPS' AND "status" IN ('TRIALING','ACTIVE') AND "cancelPending"=false AND "canceledAt" IS NULL AND "periodEnd"<=NOW()+INTERVAL '2 days' AND ("chargeScheduledFor" IS NULL OR "chargeScheduledFor"<>"periodEnd") ORDER BY "periodEnd", "id" LIMIT 100`;
  for (const sub of due)
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sub.id}))`;
      const latest = await tx.subscription.findUnique({
        where: { id: sub.id },
      });
      if (!latest || latest.canceledAt || latest.cancelPending) return;
      await enqueue(
        "charge",
        { subscriptionId: sub.id, due: sub.periodEnd.toISOString() },
        `charge:${sub.id}:${sub.periodEnd.toISOString()}`,
        tx,
      );
      await tx.subscription.update({
        where: { id: sub.id },
        data: { chargeScheduledFor: sub.periodEnd },
      });
    });
  const reminders = await prisma.subscription.findMany({
    where: {
      status: "TRIALING",
      reminderSentAt: null,
      periodEnd: {
        lte: new Date(Date.now() + cfg.reminderHours * 3600_000),
        gt: now,
      },
    },
    orderBy: { periodEnd: "asc" },
    take: 100,
    include: { user: true },
  });
  for (const sub of reminders)
    await prisma.$transaction(async (tx) => {
      await enqueue(
        "email",
        {
          type: "renewal_reminder",
          to: sub.user.email,
          userId: sub.userId,
          ctx: {
            periodEnd: sub.periodEnd.toISOString(),
            renewalOre: sub.priceOre,
          },
        },
        `reminder:${sub.id}`,
        tx,
      );
      await tx.subscription.update({
        where: { id: sub.id },
        data: { reminderSentAt: now },
      });
    });
  const expired = await prisma.subscription.updateMany({
    where: {
      OR: [
        { status: "CANCELED", periodEnd: { lte: now }, cancelPending: false },
        { status: "PAST_DUE", graceUntil: { lte: now } },
      ],
    },
    data: { status: "EXPIRED", endedAt: now },
  });
  return { scheduled: due.length, expired: expired.count };
}

export async function scheduleCharge(id: string, due: string) {
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const sub = await tx.subscription.findUnique({ where: { id } });
      if (
        !sub ||
        sub.canceledAt ||
        sub.cancelPending ||
        sub.periodEnd.toISOString() !== due
      )
        return;
      const result = await providerFor(sub.provider).chargeRecurring({
        subscriptionId: id,
        agreementId: sub.providerAgreementId,
        amountOre: sub.priceOre,
        dueDate: sub.periodEnd,
        description: "Skiltnummeret.no månedsabonnement",
      });
      if (!result.ok) throw new Error("Charge scheduling failed");
      await tx.idempotencyKey.upsert({
        where: { key: `charge:${id}:${due}` },
        update: { result: { chargeId: result.providerPaymentId } },
        create: {
          key: `charge:${id}:${due}`,
          result: { chargeId: result.providerPaymentId },
        },
      });
    },
    { timeout: 20000 },
  );
}
