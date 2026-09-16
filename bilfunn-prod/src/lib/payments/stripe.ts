import Stripe from "stripe";
import { env } from "../env";
import type { ChargeInput, ChargeResult, PaymentProvider, StartCheckoutInput, StartCheckoutResult } from "./types";

/**
 * Cards via Stripe Billing.
 *
 * The NOK 3 / 3 days / NOK 249 month structure is expressed as a subscription on
 * STRIPE_PRICE_MONTHLY with a 3-day trial plus a one-off invoice item of NOK 3,
 * so Stripe owns the renewal schedule and we react to invoice webhooks. Note the
 * fixed per-transaction fee makes the NOK 3 charge roughly break-even — that is an
 * acquisition cost, not a revenue line.
 */
export const stripe = env.payments.stripe.secret
  ? new Stripe(env.payments.stripe.secret, { apiVersion: "2024-11-20.acacia" as any })
  : null;

export const stripeProvider: PaymentProvider = {
  name: "STRIPE",

  async startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
    if (!stripe) throw new Error("STRIPE_SECRET_KEY is not set");

    const customer = await stripe.customers.create({
      email: input.email,
      metadata: { userId: input.userId },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      locale: "nb",
      line_items: [{ price: env.payments.stripe.priceMonthly, quantity: 1 }],
      subscription_data: {
        trial_period_days: input.introDays,
        metadata: { userId: input.userId, plate: input.plate },
      },
      // The NOK 3 is charged immediately alongside the trial.
      payment_method_collection: "always",
      success_url: `${input.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.baseUrl}/kjoretoy/${input.plate}?avbrutt=1`,
      consent_collection: { terms_of_service: "required" },
      custom_text: {
        submit: {
          message: `Du belastes ${(input.introPriceOre / 100).toFixed(0)} kr nå for ${input.introDays} dagers tilgang. Deretter ${(input.renewalPriceOre / 100).toFixed(0)} kr per måned til du sier opp.`,
        },
      },
      metadata: { userId: input.userId, plate: input.plate, introPriceOre: String(input.introPriceOre) },
    });

    return {
      provider: "STRIPE",
      redirectUrl: session.url,
      providerCustomerId: customer.id,
      reference: session.id,
    };
  },

  async chargeRecurring(_input: ChargeInput): Promise<ChargeResult> {
    // Stripe Billing drives its own renewal cycle; our cron does not charge cards.
    // Outcomes arrive via invoice.paid / invoice.payment_failed webhooks.
    return { ok: true, providerPaymentId: null };
  },

  async cancel({ subscriptionId }) {
    if (!stripe || !subscriptionId) return;
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  },

  async refund(providerPaymentId: string, amountOre: number) {
    if (!stripe) return;
    await stripe.refunds.create({ payment_intent: providerPaymentId, amount: amountOre });
  },
};
