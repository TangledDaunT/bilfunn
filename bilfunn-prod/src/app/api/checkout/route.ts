export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { env, emailConfigured } from "@/lib/env";
import { getProvider } from "@/lib/payments";
import { getCurrentUser } from "@/lib/session";
import { hasAccess } from "@/lib/billing";
import { enforceRateLimit as rateLimit } from "@/lib/rateLimit";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import { endpoint, HttpError, jsonBody } from "@/lib/http";
export const POST = endpoint(async (req) => {
  const user = await getCurrentUser();
  if (!user?.emailVerifiedAt)
    throw new HttpError(401, "verify_email_before_checkout");
  const body = await jsonBody(
    req,
    z
      .object({
        email: z.string().email().optional(),
        method: z.enum(["vipps", "card"]),
        plate: z.string().max(12),
        accepted: z.literal(true),
      })
      .strict(),
  );
  if (body.email && body.email.toLowerCase() !== user.email)
    throw new HttpError(403, "email_mismatch");
  if (!(await rateLimit(`checkout:${user.id}`, 10, 3600_000)).ok)
    throw new HttpError(429, "too_many_attempts");
  const plate = normalizePlate(body.plate);
  if (!isValidPlate(plate)) throw new HttpError(400, "invalid_plate");
  const cfg = await getConfig();
  if (hasAccess(user.subscriptions[0], cfg.cancelKeepsAccess))
    return NextResponse.json({ next: `/rapport/${plate}` });
  if (!emailConfigured()) throw new HttpError(503, "email_unavailable");
  const provider = getProvider(body.method);
  const checkout = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
    const account = await tx.user.findUnique({ where: { id: user.id } });
    if (!account || account.deletedAt || !account.emailVerifiedAt)
      throw new HttpError(401, "authentication_required");
    const active = await tx.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
    });
    if (active && hasAccess(active, cfg.cancelKeepsAccess))
      throw new HttpError(409, "subscription_already_active");
    const pending = await tx.checkout.findFirst({
      where: { userId: user.id, status: "PENDING" },
    });
    if (pending) {
      if (pending.provider !== provider.name)
        throw new HttpError(409, "checkout_already_pending");
      return pending;
    }
    return tx.checkout.create({
      data: {
        userId: user.id,
        provider: provider.name,
        plate,
        introOre: cfg.introPriceOre,
        renewalOre: cfg.renewalPriceOre,
        introDays: cfg.introDays,
        vatBps: cfg.vatBps,
      },
    });
  });
  if (checkout.redirectUrl)
    return NextResponse.json({ redirectUrl: checkout.redirectUrl });
  if (provider.name === "MOCK")
    throw new HttpError(503, "use_payment_test_environment");
  // Provider idempotency retention is finite. Never recreate an uncertain checkout after it expires.
  if (Date.now() - checkout.createdAt.getTime() > 20 * 3600000)
    throw new HttpError(409, "checkout_reconciliation_required");
  const started = await provider.startCheckout({
    checkoutId: checkout.id,
    userId: user.id,
    email: user.email,
    plate: checkout.plate,
    introPriceOre: checkout.introOre,
    renewalPriceOre: checkout.renewalOre,
    introDays: checkout.introDays,
    returnUrl: `${env.baseUrl}/kvittering?nr=${checkout.plate}&checkout=${checkout.id}`,
  });
  if (
    !started.redirectUrl ||
    new URL(started.redirectUrl).protocol !== "https:"
  )
    throw new HttpError(502, "invalid_provider_response");
  await prisma.checkout.update({
    where: { id: checkout.id },
    data: {
      reference: started.reference,
      customerId: started.providerCustomerId,
      subscriptionId: started.providerAgreementId,
      redirectUrl: started.redirectUrl,
    },
  });
  return NextResponse.json({ redirectUrl: started.redirectUrl });
});
