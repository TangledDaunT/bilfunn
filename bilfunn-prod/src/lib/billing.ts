import { Prisma, type Subscription, type User } from "@prisma/client";
import { prisma } from "./db";
import { getConfig } from "./config";
import { vatOf } from "./money";
import { sendEmail } from "./email";
import { track } from "./analytics";
import { env } from "./env";
import { getProvider, providerFor } from "./payments";

const DAY = 86400000;

/** Access is decided here and nowhere else. */
export function hasAccess(sub: Subscription | null | undefined, cancelKeepsAccess = true): boolean {
  if (!sub) return false;
  const now = Date.now();
  switch (sub.status) {
    case "TRIALING":
    case "ACTIVE":
      return now < sub.periodEnd.getTime();
    case "PAST_DUE":
      return Boolean(sub.graceUntil && now < sub.graceUntil.getTime());
    case "CANCELED":
      return cancelKeepsAccess && now < sub.periodEnd.getTime();
    default:
      return false;
  }
}

export async function receiptNumber() {
  const count = await prisma.payment.count();
  return `BF-${String(100000 + count + 1)}`;
}

export async function recordPayment(opts: {
  userId: string;
  subscriptionId: string | null;
  kind: "INTRO" | "RENEWAL" | "RETRY";
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  amountOre: number;
  provider: "MOCK" | "STRIPE" | "VIPPS";
  providerPaymentId?: string | null;
  failureCode?: string | null;
}) {
  const cfg = await getConfig();
  return prisma.payment.create({
    data: {
      userId: opts.userId,
      subscriptionId: opts.subscriptionId,
      kind: opts.kind,
      status: opts.status,
      amountOre: opts.amountOre,
      vatOre: vatOf(opts.amountOre, cfg.vatBps),
      provider: opts.provider,
      providerPaymentId: opts.providerPaymentId ?? null,
      failureCode: opts.failureCode ?? null,
      receiptNumber: await receiptNumber(),
    },
  });
}

export async function startSubscription(opts: {
  user: User;
  provider: "MOCK" | "STRIPE" | "VIPPS";
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerAgreementId?: string | null;
  paymentBrand?: string | null;
  paymentLast4?: string | null;
}) {
  const cfg = await getConfig();
  const now = new Date();
  const sub = await prisma.subscription.create({
    data: {
      userId: opts.user.id,
      status: "TRIALING",
      provider: opts.provider,
      providerCustomerId: opts.providerCustomerId ?? null,
      providerSubscriptionId: opts.providerSubscriptionId ?? null,
      providerAgreementId: opts.providerAgreementId ?? null,
      paymentBrand: opts.paymentBrand ?? null,
      paymentLast4: opts.paymentLast4 ?? null,
      priceOre: cfg.renewalPriceOre,
      periodStart: now,
      periodEnd: new Date(now.getTime() + cfg.introDays * DAY),
    },
  });

  await sendEmail("welcome", opts.user.email, { days: cfg.introDays, link: `${env.baseUrl}/konto` }, opts.user.id);
  await sendEmail(
    "subscription_started",
    opts.user.email,
    { periodEnd: sub.periodEnd, renewalOre: cfg.renewalPriceOre, link: `${env.baseUrl}/konto` },
    opts.user.id
  );
  await track("subscription_started", { subscriptionId: sub.id }, { userId: opts.user.id });
  return sub;
}

export async function cancelSubscription(sub: Subscription, user: User, reason?: string | null) {
  const provider = providerFor(sub.provider);
  try {
    await provider.cancel({
      agreementId: sub.providerAgreementId,
      subscriptionId: sub.providerSubscriptionId,
    });
  } catch {
    // The local cancellation must succeed even if the provider call fails; the
    // cron reconciles. Never trap a customer because an API was down.
  }
  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELED", canceledAt: new Date(), cancelAt: sub.periodEnd, cancelReason: reason ?? null },
  });
  await sendEmail("cancellation", user.email, { until: updated.periodEnd }, user.id);
  await track("subscription_canceled", { reason, dayOfLife: Math.round((Date.now() - sub.startedAt.getTime()) / DAY) }, { userId: user.id });
  return updated;
}

/**
 * The billing tick. Idempotent, safe to run hourly from Vercel Cron.
 * Stripe subscriptions are driven by Stripe's own scheduler and are skipped here
 * apart from reminders; Vipps charges are created ahead of the due date.
 */
export async function runBillingCycle(now = new Date()) {
  const cfg = await getConfig();
  const summary = { reminders: 0, renewals: 0, failures: 0, retries: 0, expired: 0 };

  // 1. Reminder before the first renewal.
  const reminderDue = await prisma.subscription.findMany({
    where: {
      status: "TRIALING",
      reminderSentAt: null,
      periodEnd: { lte: new Date(now.getTime() + cfg.reminderHours * 3600000) },
    },
    include: { user: true },
    take: 200,
  });
  for (const sub of reminderDue) {
    await sendEmail(
      "renewal_reminder",
      sub.user.email,
      { periodEnd: sub.periodEnd, renewalOre: sub.priceOre, link: `${env.baseUrl}/konto` },
      sub.userId
    );
    await prisma.subscription.update({ where: { id: sub.id }, data: { reminderSentAt: now } });
    summary.reminders++;
  }

  // 2. Renewals. Vipps needs lead time, so create the charge before the due date.
  const renewDue = await prisma.subscription.findMany({
    where: {
      status: { in: ["TRIALING", "ACTIVE"] },
      provider: { in: ["MOCK", "VIPPS"] },
      periodEnd: { lte: new Date(now.getTime() + (cfg.introDays > 0 ? 2 : 0) * DAY) },
    },
    include: { user: true },
    take: 200,
  });
  for (const sub of renewDue) {
    if (sub.periodEnd.getTime() > now.getTime() && sub.provider !== "VIPPS") continue;
    const provider = providerFor(sub.provider);
    const result = await provider.chargeRecurring({
      subscriptionId: sub.id,
      agreementId: sub.providerAgreementId,
      customerId: sub.providerCustomerId,
      amountOre: sub.priceOre,
      description: "Bilfunn månedsabonnement",
      dueDate: sub.periodEnd,
    });

    if (sub.provider === "VIPPS") {
      // Terminal state arrives by webhook; only record the attempt.
      await recordPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: sub.status === "TRIALING" ? "RENEWAL" : "RENEWAL",
        status: "PENDING",
        amountOre: sub.priceOre,
        provider: "VIPPS",
        providerPaymentId: result.providerPaymentId,
      });
      continue;
    }

    if (result.ok) {
      await markRenewed(sub.id, sub.periodEnd, sub.priceOre);
      await recordPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: "RENEWAL",
        status: "SUCCEEDED",
        amountOre: sub.priceOre,
        provider: sub.provider,
        providerPaymentId: result.providerPaymentId,
      });
      await sendEmail(
        "renewal_success",
        sub.user.email,
        { amountOre: sub.priceOre, periodEnd: new Date(sub.periodEnd.getTime() + 30 * DAY) },
        sub.userId
      );
      summary.renewals++;
    } else {
      await markPastDue(sub.id, now, cfg.graceDays, cfg.retryDays[0] ?? 1);
      await recordPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: "RENEWAL",
        status: "FAILED",
        amountOre: sub.priceOre,
        provider: sub.provider,
        failureCode: result.failureCode,
      });
      await sendEmail(
        "payment_failed",
        sub.user.email,
        { graceUntil: new Date(now.getTime() + cfg.graceDays * DAY), link: `${env.baseUrl}/konto` },
        sub.userId
      );
      summary.failures++;
    }
  }

  // 3. Dunning retries (non-Stripe, non-Vipps — both run their own retry logic).
  const retryDue = await prisma.subscription.findMany({
    where: { status: "PAST_DUE", provider: "MOCK", nextRetryAt: { lte: now } },
    include: { user: true },
    take: 200,
  });
  for (const sub of retryDue) {
    const provider = providerFor(sub.provider);
    const result = await provider.chargeRecurring({
      subscriptionId: sub.id,
      agreementId: sub.providerAgreementId,
      amountOre: sub.priceOre,
      description: "Bilfunn – nytt betalingsforsøk",
    });
    if (result.ok) {
      await markRenewed(sub.id, now, sub.priceOre);
      await recordPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: "RETRY",
        status: "SUCCEEDED",
        amountOre: sub.priceOre,
        provider: sub.provider,
      });
      summary.retries++;
    } else {
      const attempts = sub.failedAttempts + 1;
      const schedule = cfg.retryDays;
      if (attempts >= schedule.length) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "EXPIRED", failedAttempts: attempts, nextRetryAt: null, endedAt: now },
        });
        summary.expired++;
      } else {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { failedAttempts: attempts, nextRetryAt: new Date(now.getTime() + schedule[attempts] * DAY) },
        });
      }
      await recordPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: "RETRY",
        status: "FAILED",
        amountOre: sub.priceOre,
        provider: sub.provider,
        failureCode: result.failureCode,
      });
    }
  }

  // 4. Expire cancelled and lapsed subscriptions.
  const expired = await prisma.subscription.updateMany({
    where: {
      OR: [
        { status: "CANCELED", periodEnd: { lte: now } },
        { status: "PAST_DUE", graceUntil: { lte: now }, nextRetryAt: null },
      ],
    },
    data: { status: "EXPIRED", endedAt: now },
  });
  summary.expired += expired.count;

  return summary;
}

export async function markRenewed(subscriptionId: string, from: Date, priceOre: number) {
  const start = from.getTime() > Date.now() ? from : new Date();
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "ACTIVE",
      periodStart: start,
      periodEnd: new Date(start.getTime() + 30 * DAY),
      renewals: { increment: 1 },
      searchesThisPeriod: 0,
      failedAttempts: 0,
      graceUntil: null,
      nextRetryAt: null,
      priceOre,
    },
  });
}

export async function markPastDue(subscriptionId: string, now: Date, graceDays: number, retryInDays: number) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "PAST_DUE",
      failedAttempts: 1,
      graceUntil: new Date(now.getTime() + graceDays * DAY),
      nextRetryAt: new Date(now.getTime() + retryInDays * DAY),
    },
  });
}

/** Search allowance, enforced server-side only. */
export async function searchAllowance(userId: string, sub: Subscription | null) {
  const cfg = await getConfig();
  if (!sub) return { limit: 0, used: 0, left: 0 };
  const limit = sub.status === "TRIALING" ? cfg.introSearchLimit : cfg.monthlySearchLimit;
  return { limit, used: sub.searchesThisPeriod, left: Math.max(0, limit - sub.searchesThisPeriod) };
}

export async function consumeSearch(userId: string, sub: Subscription, plate: string) {
  const cfg = await getConfig();
  if (!cfg.duplicatesCount) {
    const dup = await prisma.search.findFirst({
      where: { userId, plate, counted: true, createdAt: { gte: new Date(Date.now() - DAY) } },
    });
    if (dup) return false;
  }
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { searchesThisPeriod: { increment: 1 } },
  });
  return true;
}
