import { stripe } from "./stripe";
import { prisma } from "../db";
import { getConfig } from "../config";
import { once, applyPaid } from "./events";
import { HttpError } from "../http";
import { enqueue } from "../jobs";
import { getVippsResource, getVippsChargePage } from "./vipps";
import { reconcileVippsCharge } from "./vipps-state";
export async function reconcileStripeInvoice(
  invoiceId: string,
  eventId: string,
  failed = false,
) {
  if (!stripe) throw new Error("Stripe disabled");
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const checkoutId = subscription.metadata.checkoutId;
  const checkout = checkoutId
    ? await prisma.checkout.findUnique({ where: { id: checkoutId } })
    : null;
  if (
    !checkout ||
    checkout.provider !== "STRIPE" ||
    subscription.metadata.userId !== checkout.userId
  )
    throw new HttpError(503, "checkout_reconciliation_pending");
  const initial = invoice.billing_reason === "subscription_create";
  const cfg = await getConfig();
  const charge = invoice.charge
    ? await stripe.charges.retrieve(
        typeof invoice.charge === "string" ? invoice.charge : invoice.charge.id,
      )
    : null;
  await once("STRIPE", eventId, async (tx) => {
    if (invoice.paid && invoice.status === "paid") {
      if (invoice.currency !== "nok") throw new Error("Unexpected currency");
      // Renewal periods belong to the invoice, not delivery time or current mutable config.
      const recurring = invoice.lines.data.find(
        (line) => line.type === "subscription",
      );
      const start = initial
        ? (subscription.trial_start ?? invoice.created)
        : recurring?.period.start;
      const end = initial ? subscription.trial_end : recurring?.period.end;
      if (!start || !end) throw new Error("Missing billing period");
      await applyPaid(tx, checkout, {
        id: invoice.id!,
        amount: invoice.amount_paid,
        initial,
        start: new Date(start * 1000),
        end: new Date(end * 1000),
        subscriptionId,
        customerId:
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id,
        canceled:
          subscription.cancel_at_period_end ||
          subscription.status === "canceled",
      });
      if (charge)
        await tx.payment.updateMany({
          where: {
            provider: "STRIPE",
            providerPaymentId: invoice.id!,
            refundedOre: { lte: charge.amount_refunded },
          },
          data: {
            refundedOre: charge.amount_refunded,
            ...(charge.refunded ? { status: "REFUNDED" } : {}),
          },
        });
      if (subscription.status === "canceled")
        await tx.subscription.updateMany({
          where: { checkoutId },
          data: {
            status: "EXPIRED",
            endedAt: new Date(),
            cancelPending: false,
          },
        });
    } else if (failed && subscription.status === "past_due") {
      await tx.subscription.updateMany({
        where: { checkoutId, canceledAt: null, periodEnd: { lte: new Date() } },
        data: {
          status: "PAST_DUE",
          graceUntil: new Date(
            invoice.created * 1000 + cfg.graceDays * 86400_000,
          ),
        },
      });
    }
  });
}
export async function reconciliationPage(after: string, run: string) {
  const rows = await prisma.checkout.findMany({
    where: {
      id: { gt: after },
      status: { in: ["PENDING", "COMPLETED"] },
      provider: { in: ["STRIPE", "VIPPS"] },
      createdAt: { lt: new Date(Date.now() - 120000) },
    },
    orderBy: { id: "asc" },
    take: 50,
  });
  for (const row of rows)
    await enqueue(
      "reconcile-checkout",
      { checkoutId: row.id },
      `reconcile:${run}:${row.id}`,
    );
  if (rows.length === 50)
    await enqueue(
      "reconcile-page",
      { after: rows[49].id, run },
      `reconcile-page:${run}:${rows[49].id}`,
    );
}
export async function reconcileCheckout(id: string, continuation?: string) {
  const c = await prisma.checkout.findUnique({ where: { id } });
  if (!c) return;
  if (c.provider === "STRIPE") {
    if (!stripe || !c.reference)
      throw new Error("Checkout requires provider recovery");
    const session = await stripe.checkout.sessions.retrieve(c.reference);
    if (session.status === "expired") {
      await prisma.checkout.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      return;
    }
    if (!session.subscription) return;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 10,
      ...(continuation ? { starting_after: continuation } : {}),
    });
    for (const invoice of invoices.data)
      await enqueue(
        "reconcile-stripe-invoice",
        { invoiceId: invoice.id },
        `reconcile-invoice:${invoice.id}:${invoice.status}:${invoice.amount_paid}`,
      );
    if (invoices.has_more)
      await enqueue("reconcile-checkout", {
        checkoutId: id,
        continuation: invoices.data.at(-1)!.id,
      });
    const state = await stripe.subscriptions.retrieve(subscriptionId);
    if (state.status === "canceled" || state.cancel_at_period_end)
      await prisma.subscription.updateMany({
        where: { checkoutId: id },
        data: {
          status: state.status === "canceled" ? "EXPIRED" : "CANCELED",
          canceledAt: new Date(),
          cancelPending: false,
        },
      });
  } else if (c.provider === "VIPPS") {
    if (!c.subscriptionId)
      throw new Error("Checkout requires provider recovery");
    const agreement = await getVippsResource(`agreements/${c.subscriptionId}`);
    if (["STOPPED", "EXPIRED"].includes(agreement.status)) {
      await prisma.subscription.updateMany({
        where: { checkoutId: id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          cancelPending: false,
        },
      });
      await prisma.checkout.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
    }
    const page = await getVippsChargePage(c.subscriptionId, continuation);
    if (!Array.isArray(page.charges) || page.charges.length > 2000)
      throw new Error("Invalid charge page");
    for (const charge of page.charges)
      await enqueue(
        "reconcile-vipps-charge",
        { checkoutId: id, chargeId: charge.id },
        `reconcile-charge:${c.subscriptionId}:${charge.id}:${charge.status}:${charge.summary?.refunded}`,
      );
    if (page.next)
      await enqueue("reconcile-checkout", {
        checkoutId: id,
        continuation: page.next,
      });
  }
}
export async function reconcileVippsPayment(
  checkoutId: string,
  chargeId: string,
) {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(chargeId))
    throw new Error("Invalid charge id");
  const c = await prisma.checkout.findUniqueOrThrow({
    where: { id: checkoutId },
  });
  if (c.provider !== "VIPPS" || !c.subscriptionId)
    throw new Error("Invalid agreement");
  const agreement = await getVippsResource(`agreements/${c.subscriptionId}`);
  const charge = await getVippsResource(
    `agreements/${c.subscriptionId}/charges/${chargeId}`,
  );
  await once(
    "VIPPS",
    `reconcile:${c.subscriptionId}:${chargeId}:${charge.status}:${charge.summary?.refunded}`,
    (tx) => reconcileVippsCharge(tx, c, agreement.status, charge),
  );
}
