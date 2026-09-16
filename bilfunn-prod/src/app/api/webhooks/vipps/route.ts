import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getConfig } from "@/lib/config";
import { markPastDue, markRenewed, recordPayment } from "@/lib/billing";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * Vipps MobilePay Recurring webhooks.
 *
 * `recurring.agreement-stopped.v1` is the important one: a user can stop the
 * agreement inside the Vipps app, and without handling it we would keep granting
 * access to someone who has already cancelled. Charge outcomes also arrive here,
 * because Vipps charges settle asynchronously rather than at creation.
 */
function verify(raw: string, header: string | null) {
  if (!env.payments.vipps.webhookSecret) return true; // unset in dev
  if (!header) return false;
  const expected = createHmac("sha256", env.payments.vipps.webhookSecret).update(raw).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verify(raw, req.headers.get("authorization") || req.headers.get("x-vipps-signature"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const body = JSON.parse(raw || "{}");
  const eventName: string = body.name || body.eventType || "";
  const agreementId: string | undefined = body.agreementId || body.data?.agreementId;
  const cfg = await getConfig();

  if (!agreementId) return NextResponse.json({ received: true });

  const sub = await prisma.subscription.findFirst({
    where: { providerAgreementId: agreementId },
    include: { user: true },
  });
  if (!sub) return NextResponse.json({ received: true });

  switch (eventName) {
    case "recurring.agreement-activated.v1": {
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: "TRIALING" } });
      const payment = await recordPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: "INTRO",
        status: "SUCCEEDED",
        amountOre: cfg.introPriceOre,
        provider: "VIPPS",
        providerPaymentId: body.chargeId ?? null,
      });
      await sendEmail(
        "payment_receipt",
        sub.user.email,
        { amountOre: payment.amountOre, vatOre: payment.vatOre, receipt: payment.receiptNumber, at: payment.createdAt },
        sub.userId
      );
      await track("checkout_completed", { provider: "vipps" }, { userId: sub.userId });
      break;
    }

    case "recurring.agreement-stopped.v1":
    case "recurring.agreement-expired.v1": {
      // The user cancelled in the Vipps app. Honour it immediately.
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "CANCELED", canceledAt: new Date(), cancelAt: sub.periodEnd, cancelReason: "vipps_app" },
      });
      await sendEmail("cancellation", sub.user.email, { until: sub.periodEnd }, sub.userId);
      await track("subscription_canceled", { source: "vipps_app" }, { userId: sub.userId });
      break;
    }

    case "recurring.charge-captured.v1": {
      const amount = Number(body.amount ?? sub.priceOre);
      await markRenewed(sub.id, new Date(), amount);
      await recordPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: "RENEWAL",
        status: "SUCCEEDED",
        amountOre: amount,
        provider: "VIPPS",
        providerPaymentId: body.chargeId ?? null,
      });
      await sendEmail(
        "renewal_success",
        sub.user.email,
        { amountOre: amount, periodEnd: new Date(Date.now() + 30 * 86400000) },
        sub.userId
      );
      break;
    }

    case "recurring.charge-failed.v1":
    case "recurring.charge-creation-failed.v1": {
      await markPastDue(sub.id, new Date(), cfg.graceDays, cfg.retryDays[0] ?? 1);
      await recordPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: "RENEWAL",
        status: "FAILED",
        amountOre: sub.priceOre,
        provider: "VIPPS",
        failureCode: body.failureReason ?? "vipps_charge_failed",
      });
      await sendEmail(
        "payment_failed",
        sub.user.email,
        { graceUntil: new Date(Date.now() + cfg.graceDays * 86400000), link: `${env.baseUrl}/konto` },
        sub.userId
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
