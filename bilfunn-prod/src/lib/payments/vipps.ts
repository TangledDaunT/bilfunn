import { env } from "../env";
import type { ChargeInput, ChargeResult, PaymentProvider, StartCheckoutInput, StartCheckoutResult } from "./types";

/**
 * Vipps MobilePay Recurring API v3.
 * Docs: https://developer.vippsmobilepay.com/docs/APIs/recurring-api/
 *
 * Product mapping:
 *   NOK 3 today + NOK 249/month  →  one agreement with `initialCharge` of 300 øre
 *   and a monthly interval at 24900 øre.
 *
 * Operational notes that shaped this file:
 *  - Charges are created ahead of their due date (the default agreement type
 *    requires at least one day's lead time), so the billing cron creates the
 *    renewal charge a day early rather than at the moment the period ends.
 *  - Vipps retries a failed charge internally for up to five days; we do not run
 *    a competing retry loop against Vipps, we wait for the terminal webhook.
 *  - Users can stop the agreement inside the Vipps app. The
 *    `recurring.agreement-stopped.v1` webhook is therefore load-bearing: without
 *    it we would keep granting access to someone who has cancelled.
 *  - Agreement creation is rejected for users under 18.
 */
type Token = { value: string; expiresAt: number };
let cachedToken: Token | null = null;

function headers(token: string, idempotencyKey?: string) {
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Ocp-Apim-Subscription-Key": env.payments.vipps.subscriptionKey,
    "Merchant-Serial-Number": env.payments.vipps.msn,
    "Vipps-System-Name": "bilfunn",
    "Vipps-System-Version": "1.0.0",
    "Content-Type": "application/json",
  };
  if (idempotencyKey) h["Idempotency-Key"] = idempotencyKey;
  return h;
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(`${env.payments.vipps.baseUrl}/accesstoken/get`, {
    method: "POST",
    headers: {
      client_id: env.payments.vipps.clientId,
      client_secret: env.payments.vipps.clientSecret,
      "Ocp-Apim-Subscription-Key": env.payments.vipps.subscriptionKey,
      "Merchant-Serial-Number": env.payments.vipps.msn,
    },
  });
  if (!res.ok) throw new Error(`Vipps token failed: ${res.status} ${await res.text()}`);
  const json: any = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + Number(json.expires_in ?? 3000) * 1000 };
  return cachedToken.value;
}

export const vippsProvider: PaymentProvider = {
  name: "VIPPS",

  async startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
    const token = await accessToken();
    const body = {
      interval: { unit: "MONTH", count: 1 },
      pricing: { type: "LEGACY", amount: input.renewalPriceOre, currency: "NOK" },
      initialCharge: {
        amount: input.introPriceOre,
        description: `Bilfunn – ${input.introDays} dagers tilgang`,
        transactionType: "DIRECT_CAPTURE",
      },
      merchantRedirectUrl: input.returnUrl,
      merchantAgreementUrl: `${env.baseUrl}/konto`,
      productName: "Bilfunn abonnement",
      productDescription: `${input.introDays} dagers tilgang, deretter månedsabonnement`,
      scope: "address name email",
      phoneNumber: undefined as string | undefined,
    };
    const res = await fetch(`${env.payments.vipps.baseUrl}/recurring/v3/agreements`, {
      method: "POST",
      headers: headers(token, `agr-${input.userId}-${Date.now()}`),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Vipps agreement failed: ${res.status} ${await res.text()}`);
    const json: any = await res.json();
    return {
      provider: "VIPPS",
      redirectUrl: json.vippsConfirmationUrl ?? json.confirmationUrl,
      providerAgreementId: json.agreementId ?? json.uuid,
      reference: json.agreementId ?? json.uuid,
    };
  },

  async chargeRecurring(input: ChargeInput & { agreementId?: string | null }): Promise<ChargeResult> {
    if (!input.agreementId) return { ok: false, failureCode: "missing_agreement" };
    const token = await accessToken();
    // Due date must be at least one day ahead for standard (delayed) charges.
    const due = input.dueDate ?? new Date(Date.now() + 2 * 86400000);
    const res = await fetch(
      `${env.payments.vipps.baseUrl}/recurring/v3/agreements/${input.agreementId}/charges`,
      {
        method: "POST",
        headers: headers(token, `chg-${input.subscriptionId}-${due.toISOString().slice(0, 10)}`),
        body: JSON.stringify({
          amount: input.amountOre,
          transactionType: "DIRECT_CAPTURE",
          description: input.description,
          due: due.toISOString().slice(0, 10),
          retryDays: 5,
        }),
      }
    );
    if (!res.ok) return { ok: false, failureCode: `vipps_${res.status}` };
    const json: any = await res.json();
    // A created charge is not yet captured — the terminal state arrives by webhook.
    return { ok: true, providerPaymentId: json.chargeId ?? json.id ?? null };
  },

  async cancel({ agreementId }) {
    if (!agreementId) return;
    const token = await accessToken();
    await fetch(`${env.payments.vipps.baseUrl}/recurring/v3/agreements/${agreementId}`, {
      method: "PATCH",
      headers: headers(token),
      body: JSON.stringify({ status: "STOPPED" }),
    });
  },

  async refund(providerPaymentId: string, amountOre: number) {
    const token = await accessToken();
    const [agreementId, chargeId] = providerPaymentId.split(":");
    await fetch(
      `${env.payments.vipps.baseUrl}/recurring/v3/agreements/${agreementId}/charges/${chargeId}/refund`,
      {
        method: "POST",
        headers: headers(token, `ref-${chargeId}`),
        body: JSON.stringify({ amount: amountOre, description: "Refusjon Bilfunn" }),
      }
    );
  },
};
