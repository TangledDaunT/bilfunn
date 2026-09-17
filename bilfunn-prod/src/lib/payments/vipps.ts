import { env } from "../env";
import type {
  ChargeInput,
  ChargeResult,
  PaymentProvider,
  StartCheckoutInput,
  StartCheckoutResult,
} from "./types";

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
    "Vipps-System-Name": "skiltnummeret",
    "Vipps-System-Version": "1.0.0",
    "Content-Type": "application/json",
  };
  if (idempotencyKey) h["Idempotency-Key"] = idempotencyKey;
  return h;
}

export async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000)
    return cachedToken.value;
  const res = await fetch(`${env.payments.vipps.baseUrl}/accesstoken/get`, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      client_id: env.payments.vipps.clientId,
      client_secret: env.payments.vipps.clientSecret,
      "Ocp-Apim-Subscription-Key": env.payments.vipps.subscriptionKey,
      "Merchant-Serial-Number": env.payments.vipps.msn,
    },
  });
  if (!res.ok) throw new Error(`Vipps token failed: ${res.status} `);
  const json: any = await res.json();
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + Number(json.expires_in ?? 3000) * 1000,
  };
  return cachedToken.value;
}

export const vippsProvider: PaymentProvider = {
  name: "VIPPS",

  async startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
    const token = await accessToken();
    const body = {
      interval: { unit: "MONTH", count: 1 },
      pricing: {
        type: "LEGACY",
        amount: input.renewalPriceOre,
        currency: "NOK",
      },
      initialCharge: {
        orderId: `intro-${input.checkoutId}`,
        amount: input.introPriceOre,
        description: `Skiltnummeret.no – ${input.introDays} dagers tilgang`,
        transactionType: "DIRECT_CAPTURE",
      },
      merchantRedirectUrl: input.returnUrl,
      merchantAgreementUrl: `${env.baseUrl}/konto`,
      productName: "Skiltnummeret.no abonnement",
      productDescription: `${input.introDays} dagers tilgang, deretter månedsabonnement`,
      scope: "email",
      phoneNumber: undefined as string | undefined,
    };
    const res = await fetch(
      `${env.payments.vipps.baseUrl}/recurring/v3/agreements`,
      {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: headers(token, `agr-${input.checkoutId}`),
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) throw new Error(`Vipps agreement failed: ${res.status} `);
    const json: any = await res.json();
    return {
      provider: "VIPPS",
      redirectUrl: json.vippsConfirmationUrl ?? json.confirmationUrl,
      providerAgreementId: json.agreementId ?? json.uuid,
      reference: json.agreementId ?? json.uuid,
    };
  },

  async chargeRecurring(
    input: ChargeInput & { agreementId?: string | null },
  ): Promise<ChargeResult> {
    if (!input.agreementId)
      return { ok: false, failureCode: "missing_agreement" };
    const token = await accessToken();
    // Due date must be at least one day ahead for standard (delayed) charges.
    const due = input.dueDate ?? new Date(Date.now() + 2 * 86400000);
    const orderId = `chg-${input.subscriptionId}-${due.toISOString().slice(0, 10)}`;
    const existing = await getVippsResource(
      `agreements/${input.agreementId}/charges/${orderId}`,
      true,
    );
    if (existing) {
      if (existing.amount !== input.amountOre || existing.currency !== "NOK")
        throw new Error("Existing charge mismatch");
      return { ok: true, providerPaymentId: existing.id };
    }
    const res = await fetch(
      `${env.payments.vipps.baseUrl}/recurring/v3/agreements/${input.agreementId}/charges`,
      {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: headers(
          token,
          `chg-${input.subscriptionId}-${due.toISOString().slice(0, 10)}`,
        ),
        body: JSON.stringify({
          amount: input.amountOre,
          orderId,
          transactionType: "DIRECT_CAPTURE",
          description: input.description,
          due: due.toISOString().slice(0, 10),
          retryDays: 5,
        }),
      },
    );
    if (!res.ok) return { ok: false, failureCode: `vipps_${res.status}` };
    const json: any = await res.json();
    // A created charge is not yet captured — the terminal state arrives by webhook.
    return { ok: true, providerPaymentId: json.chargeId ?? json.id ?? null };
  },

  async cancel({ agreementId }) {
    if (!agreementId) throw new Error("Missing agreement");
    const current = await getVippsResource(`agreements/${agreementId}`);
    if (["STOPPED", "EXPIRED"].includes(current.status)) return;
    const token = await accessToken();
    const response = await fetch(
      `${env.payments.vipps.baseUrl}/recurring/v3/agreements/${agreementId}`,
      {
        method: "PATCH",
        signal: AbortSignal.timeout(8000),
        headers: headers(token),
        body: JSON.stringify({ status: "STOPPED" }),
      },
    );
    if (!response.ok) throw new Error("Cancellation failed");
  },

  async refund(providerPaymentId: string, amountOre: number) {
    const token = await accessToken();
    const [agreementId, chargeId] = providerPaymentId.split(":");
    const response = await fetch(
      `${env.payments.vipps.baseUrl}/recurring/v3/agreements/${agreementId}/charges/${chargeId}/refund`,
      {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: headers(token, `ref-${chargeId}`),
        body: JSON.stringify({
          amount: amountOre,
          description: "Refusjon Skiltnummeret.no",
        }),
      },
    );
    if (!response.ok) throw new Error("Refund failed");
  },
};

export async function getVippsResource(path: string, allowMissing = false) {
  const response = await fetch(
    `${env.payments.vipps.baseUrl}/recurring/v3/${path}`,
    {
      headers: headers(await accessToken()),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      redirect: "error",
    },
  );
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error("Vipps resource unavailable");
  return response.json();
}

export async function getVippsChargePage(
  agreementId: string,
  continuation?: string,
) {
  const response = await fetch(
    `${env.payments.vipps.baseUrl}/recurring/v3/agreements/${agreementId}/charges`,
    {
      headers: {
        ...headers(await accessToken()),
        ...(continuation ? { "Continuation-Token": continuation } : {}),
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      redirect: "error",
    },
  );
  if (!response.ok) throw new Error("Vipps reconciliation unavailable");
  return {
    charges: await response.json(),
    next: response.headers.get("Continuation-Token"),
  };
}
