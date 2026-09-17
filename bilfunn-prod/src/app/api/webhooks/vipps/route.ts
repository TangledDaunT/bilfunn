export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyVipps } from "@/lib/payments/vipps-signature";
import { getVippsResource } from "@/lib/payments/vipps";
import { once } from "@/lib/payments/events";
import { reconcileVippsCharge } from "@/lib/payments/vipps-state";
import { sha256 } from "@/lib/crypto";
import { endpoint, readBody, HttpError } from "@/lib/http";
export const runtime = "nodejs";
const Body = z.object({
  eventType: z.string(),
  agreementId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  chargeId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  chargeType: z.enum(["INITIAL", "RECURRING", "UNSCHEDULED"]).optional(),
  occurred: z.string().datetime({ offset: true }),
  msn: z.string(),
  currency: z.string().optional(),
  transactionId: z.string().nullable().optional(),
});
export const POST = endpoint(async (req) => {
  if (!env.payments.vipps.webhookSecret)
    throw new HttpError(503, "vipps_disabled");
  const raw = await readBody(req, 256_000);
  if (
    !verifyVipps(
      raw,
      req.headers,
      `${env.baseUrl}/api/webhooks/vipps`,
      env.payments.vipps.webhookSecret,
    )
  )
    throw new HttpError(401, "invalid_signature");
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "invalid_json");
  }
  const parsed = Body.safeParse(decoded);
  if (!parsed.success) throw new HttpError(400, "invalid_event");
  const body = parsed.data;
  if (body.msn !== env.payments.vipps.msn)
    throw new HttpError(403, "merchant_mismatch");
  const checkout = await prisma.checkout.findFirst({
    where: { provider: "VIPPS", subscriptionId: body.agreementId },
  });
  if (!checkout) throw new HttpError(503, "checkout_reconciliation_pending");
  const agreement = await getVippsResource(`agreements/${body.agreementId}`);
  const charge = body.chargeId
    ? await getVippsResource(
        `agreements/${body.agreementId}/charges/${body.chargeId}`,
      )
    : null;
  const eventId = sha256(
    `${body.agreementId}:${body.chargeId || ""}:${body.eventType}:${body.transactionId || body.occurred}`,
  );
  await once("VIPPS", eventId, async (tx) => {
    if (charge)
      await reconcileVippsCharge(tx, checkout, agreement.status, charge);
    if (["STOPPED", "EXPIRED"].includes(agreement.status))
      await tx.subscription.updateMany({
        where: { providerAgreementId: body.agreementId },
        data: {
          status: "CANCELED",
          canceledAt: new Date(body.occurred),
          cancelPending: false,
        },
      });
    if (["REJECTED", "EXPIRED", "STOPPED"].includes(agreement.status))
      await tx.checkout.updateMany({
        where: { id: checkout.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
  });
  return NextResponse.json({ received: true });
});
