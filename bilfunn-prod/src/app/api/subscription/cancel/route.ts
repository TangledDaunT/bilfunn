import { enforceRateLimit } from "@/lib/rateLimit";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { cancelSubscription } from "@/lib/billing";
import { endpoint, jsonBody, HttpError } from "@/lib/http";
export const POST = endpoint(async (req) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "authentication_required");
  await enforceRateLimit(`cancel:${user.id}`, 10, 60_000);
  const { reason } = await jsonBody(
    req,
    z.object({ reason: z.string().max(200).optional() }),
  );
  const sub = user.subscriptions[0];
  if (!sub) throw new HttpError(400, "no_subscription");
  if (!["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED"].includes(sub.status))
    throw new HttpError(409, "subscription_not_cancellable");
  const result = await cancelSubscription(sub, user, reason);
  return NextResponse.json(
    { ok: true, pending: result.cancelPending, accessUntil: result.periodEnd },
    { status: 202 },
  );
});
export const DELETE = endpoint(async () => {
  throw new HttpError(409, "new_agreement_required");
});
