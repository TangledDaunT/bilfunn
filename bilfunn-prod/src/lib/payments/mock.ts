import type { ChargeInput, ChargeResult, PaymentProvider, StartCheckoutInput, StartCheckoutResult } from "./types";

/**
 * Used when PAYMENTS_MODE=mock, so the full purchase → access → renewal → dunning
 * → cancellation loop can be exercised before merchant onboarding completes.
 * No card data is collected or transmitted. The UI labels it plainly.
 */
export const mockProvider: PaymentProvider = {
  name: "MOCK",
  async startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
    return {
      provider: "MOCK",
      redirectUrl: null, // completed inline by the checkout route
      reference: `mock_${input.userId}_${Date.now()}`,
    };
  },
  async chargeRecurring(input: ChargeInput): Promise<ChargeResult> {
    // Deterministic failure hook for testing dunning: subscriptions whose id
    // ends in "f" always decline.
    if (input.subscriptionId.endsWith("f")) return { ok: false, failureCode: "card_declined" };
    return { ok: true, providerPaymentId: `mock_pi_${Date.now()}` };
  },
  async cancel() {},
  async refund() {},
};
