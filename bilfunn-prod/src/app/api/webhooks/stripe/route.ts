import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/payments/stripe";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { markPastDue, markRenewed, recordPayment, startSubscription } from "@/lib/billing";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * Stripe is the schedule owner for card subscriptions; this endpoint is how our
 * database learns what happened. Signature is verified before anything is read.
 */
export async function POST(req: Request) {
  if (!stripe || !env.payments.stripe.webhookSecret) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature!, env.payments.stripe.webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `signature: ${err.message}` }, { status: 400 });
  }

  const cfg = await getConfig();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) break;

      const existing = await prisma.subscription.findFirst({
        where: { userId, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } },
      });
      const sub =
        existing ??
        (await startSubscription({
          user,
          provider: "STRIPE",
          providerCustomerId: String(session.customer ?? ""),
          providerSubscriptionId: String(session.subscription ?? ""),
          paymentBrand: "card",
        }));

      const payment = await recordPayment({
        userId,
        subscriptionId: sub.id,
        kind: "INTRO",
        status: "SUCCEEDED",
        amountOre: cfg.introPriceOre,
        provider: "STRIPE",
        providerPaymentId: String(session.payment_intent ?? session.id),
      });
      await sendEmail(
        "payment_receipt",
        user.email,
        { amountOre: payment.amountOre, vatOre: payment.vatOre, receipt: payment.receiptNumber, at: payment.createdAt },
        userId
      );
      await track("checkout_completed", { provider: "stripe" }, { userId });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = await prisma.subscription.findFirst({
        where: { providerSubscriptionId: String(invoice.subscription ?? "") },
        include: { user: true },
      });
      if (!sub || invoice.amount_paid === 0) break;
      await markRenewed(sub.id, new Date(), invoice.amount_paid);
      await recordPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: "RENEWAL",
        status: "SUCCEEDED",
        amountOre: invoice.amount_paid,
        provider: "STRIPE",
        providerPaymentId: String(invoice.payment_intent ?? invoice.id),
      });
      await sendEmail(
        "renewal_success",
        sub.user.email,
        { amountOre: invoice.amount_paid, periodEnd: new Date(Date.now() + 30 * 86400000) },
        sub.userId
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = await prisma.subscription.findFirst({
        where: { providerSubscriptionId: String(invoice.subscription ?? "") },
        include: { user: true },
      });
      if (!sub) break;
      await markPastDue(sub.id, new Date(), cfg.graceDays, cfg.retryDays[0] ?? 1);
      await recordPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: "RENEWAL",
        status: "FAILED",
        amountOre: invoice.amount_due,
        provider: "STRIPE",
        failureCode: "invoice_payment_failed",
      });
      await sendEmail(
        "payment_failed",
        sub.user.email,
        { graceUntil: new Date(Date.now() + cfg.graceDays * 86400000), link: `${env.baseUrl}/konto` },
        sub.userId
      );
      break;
    }

    case "customer.subscription.deleted": {
      const s = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { providerSubscriptionId: s.id },
        data: { status: "EXPIRED", endedAt: new Date() },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
