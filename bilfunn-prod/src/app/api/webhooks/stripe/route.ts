export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/payments/stripe";
import { env } from "@/lib/env";
import { reconcileStripeInvoice } from "@/lib/payments/reconcile";
import { once } from "@/lib/payments/events";
import { endpoint, readBody, HttpError } from "@/lib/http";
export const runtime = "nodejs";
export const POST = endpoint(async (req) => {
  if (!stripe || !env.payments.stripe.webhookSecret)
    throw new HttpError(503, "stripe_disabled");
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await readBody(req, 256_000),
      req.headers.get("stripe-signature") || "",
      env.payments.stripe.webhookSecret,
    );
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "invalid_signature");
  }
  if (
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_failed"
  ) {
    await reconcileStripeInvoice(
      (event.data.object as Stripe.Invoice).id!,
      event.id,
      event.type === "invoice.payment_failed",
    );
  } else if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
  ) {
    const current = await stripe.subscriptions.retrieve(
      (event.data.object as Stripe.Subscription).id,
    );
    await once("STRIPE", event.id, async (tx) => {
      if (current.status === "canceled")
        await tx.subscription.updateMany({
          where: { providerSubscriptionId: current.id },
          data: {
            status: "EXPIRED",
            endedAt: new Date(),
            cancelPending: false,
          },
        });
      else if (current.cancel_at_period_end)
        await tx.subscription.updateMany({
          where: { providerSubscriptionId: current.id },
          data: {
            status: "CANCELED",
            canceledAt: new Date(),
            cancelAt: new Date(current.current_period_end * 1000),
            cancelPending: false,
          },
        });
    });
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    await once("STRIPE", event.id, async (tx) => {
      await tx.checkout.updateMany({
        where: { reference: session.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
    });
  } else if (event.type === "charge.refunded") {
    const charge = await stripe.charges.retrieve(
      (event.data.object as Stripe.Charge).id,
    );
    if (charge.invoice)
      await reconcileStripeInvoice(
        typeof charge.invoice === "string" ? charge.invoice : charge.invoice.id,
        event.id,
      );
  }
  // Checkout completion and redirect alone never activate paid access.
  return NextResponse.json({ received: true });
});
