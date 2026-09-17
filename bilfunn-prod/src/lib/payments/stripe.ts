import Stripe from "stripe";
import { env } from "../env";
import type { PaymentProvider } from "./types";
export const stripe = env.payments.stripe.secret
  ? new Stripe(env.payments.stripe.secret, {
      timeout: 8000,
      maxNetworkRetries: 0,
    })
  : null;
export const stripeProvider: PaymentProvider = {
  name: "STRIPE",
  async startCheckout(input) {
    if (!stripe) throw new Error("Stripe disabled");
    const [intro, monthly] = await Promise.all([
      stripe.prices.retrieve(env.payments.stripe.priceIntro),
      stripe.prices.retrieve(env.payments.stripe.priceMonthly),
    ]);
    if (
      !intro.active ||
      intro.type !== "one_time" ||
      intro.currency !== "nok" ||
      intro.unit_amount !== input.introPriceOre ||
      !monthly.active ||
      monthly.currency !== "nok" ||
      monthly.unit_amount !== input.renewalPriceOre ||
      monthly.recurring?.interval !== "month" ||
      monthly.recurring.interval_count !== 1
    )
      throw new Error("Configured prices disagree with displayed terms");
    const customer = await stripe.customers.create(
      { email: input.email, metadata: { userId: input.userId } },
      { idempotencyKey: `customer:${input.checkoutId}` },
    );
    const success = new URL(input.returnUrl);
    success.searchParams.set("checkout", input.checkoutId);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customer.id,
        locale: "nb",
        line_items: [
          { price: intro.id, quantity: 1 },
          { price: monthly.id, quantity: 1 },
        ],
        subscription_data: {
          trial_period_days: input.introDays,
          metadata: { userId: input.userId, checkoutId: input.checkoutId },
        },
        payment_method_collection: "always",
        success_url: success.toString(),
        cancel_url: `${env.baseUrl}/${input.plate}?avbrutt=1`,
        consent_collection: { terms_of_service: "required" },
        metadata: { userId: input.userId, checkoutId: input.checkoutId },
      },
      { idempotencyKey: `checkout:${input.checkoutId}` },
    );
    return {
      provider: "STRIPE",
      redirectUrl: session.url,
      providerCustomerId: customer.id,
      reference: session.id,
    };
  },
  async chargeRecurring() {
    throw new Error("Stripe owns recurring charges");
  },
  async cancel({ subscriptionId }) {
    if (!stripe || !subscriptionId) throw new Error("Missing subscription");
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  },
  async refund(id, amount) {
    if (!stripe) throw new Error("Stripe disabled");
    const invoice = await stripe.invoices.retrieve(id);
    const intent =
      typeof invoice.payment_intent === "string"
        ? invoice.payment_intent
        : invoice.payment_intent?.id;
    if (
      !intent ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > invoice.amount_paid
    )
      throw new Error("Invalid refund request");
    await stripe.refunds.create(
      { payment_intent: intent, amount },
      { idempotencyKey: `refund:${id}:${amount}` },
    );
  },
};
