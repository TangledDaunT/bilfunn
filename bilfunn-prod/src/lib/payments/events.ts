import { Prisma, type Checkout, type Provider } from "@prisma/client";
import { prisma } from "../db";
import { enqueue } from "../jobs";
import { env } from "../env";
import { vatOf } from "../money";
/** Commit an event marker and its effects together; a failed transaction remains retryable on the next delivery. */
export async function once(
  provider: Provider,
  eventId: string,
  work: (tx: Prisma.TransactionClient) => Promise<void>,
) {
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.webhookEvent.create({
          data: { id: `${provider}:${eventId}`, provider },
        });
        await work(tx);
      },
      { timeout: 15000 },
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002" &&
      (await prisma.webhookEvent.findUnique({
        where: { id: `${provider}:${eventId}` },
      }))
    )
      return;
    throw e;
  }
}
/** Apply a verified provider payment inside the caller transaction, matching the immutable checkout terms before granting access. */
export async function applyPaid(
  tx: Prisma.TransactionClient,
  checkout: Checkout,
  payment: {
    id: string;
    amount: number;
    initial: boolean;
    start: Date;
    end: Date;
    subscriptionId?: string;
    agreementId?: string;
    customerId?: string;
    canceled?: boolean;
  },
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${checkout.userId}))`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${checkout.id}))`;
  if (
    await tx.payment.findUnique({
      where: {
        provider_providerPaymentId: {
          provider: checkout.provider,
          providerPaymentId: payment.id,
        },
      },
    })
  )
    return;
  if (
    !Number.isSafeInteger(payment.amount) ||
    payment.amount !==
      (payment.initial ? checkout.introOre : checkout.renewalOre) ||
    !Number.isFinite(payment.end.getTime()) ||
    payment.end <= payment.start
  )
    throw new Error("Payment does not match accepted terms");
  const user = await tx.user.findUniqueOrThrow({
    where: { id: checkout.userId },
  });
  let sub = await tx.subscription.findUnique({
    where: { checkoutId: checkout.id },
  });
  if (sub) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sub.id}))`;
    sub = await tx.subscription.findUniqueOrThrow({ where: { id: sub.id } });
  }
  if (!sub) {
    const other = await tx.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
    });
    if (other)
      throw new Error(
        "Conflicting active subscription; reconciliation required",
      );
    sub = await tx.subscription.create({
      data: {
        userId: user.id,
        checkoutId: checkout.id,
        provider: checkout.provider,
        providerSubscriptionId: payment.subscriptionId,
        providerAgreementId: payment.agreementId,
        providerCustomerId: payment.customerId,
        priceOre: checkout.renewalOre,
        periodStart: payment.start,
        periodEnd: payment.end,
        status:
          user.deletedAt || payment.canceled
            ? "CANCELED"
            : payment.initial
              ? "TRIALING"
              : "ACTIVE",
        renewals: payment.initial ? 0 : 1,
        cancelPending: Boolean(user.deletedAt),
        canceledAt: user.deletedAt || payment.canceled ? new Date() : null,
      },
    });
  } else if (payment.end > sub.periodEnd) {
    sub = await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status:
          sub.canceledAt || payment.canceled || user.deletedAt
            ? "CANCELED"
            : payment.initial
              ? "TRIALING"
              : "ACTIVE",
        periodStart: payment.start,
        periodEnd: payment.end,
        searchesThisPeriod: 0,
        chargeScheduledFor: null,
        renewals: { increment: payment.initial ? 0 : 1 },
        graceUntil: null,
        failedAttempts: 0,
      },
    });
  }
  const row = await tx.payment.create({
    data: {
      userId: user.id,
      subscriptionId: sub.id,
      provider: checkout.provider,
      providerPaymentId: payment.id,
      kind: payment.initial ? "INTRO" : "RENEWAL",
      status: "SUCCEEDED",
      amountOre: payment.amount,
      vatOre: vatOf(payment.amount, checkout.vatBps),
    },
  });
  await tx.checkout.update({
    where: { id: checkout.id },
    data: { status: "COMPLETED" },
  });
  if (user.deletedAt)
    await enqueue("cancel", { subscriptionId: sub.id }, `cancel:${sub.id}`, tx);
  else if (env.email.resendKey && env.email.from)
    await enqueue(
      "email",
      {
        type: "payment_receipt",
        to: user.email,
        userId: user.id,
        ctx: {
          amountOre: row.amountOre,
          vatOre: row.vatOre,
          receipt: row.receiptNumber,
          at: row.createdAt.toISOString(),
        },
      },
      `receipt:${row.id}`,
      tx,
    );
}
