import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { cancelSubscription } from "@/lib/billing";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });

  const { reason } = z
    .object({ reason: z.string().max(200).optional() })
    .parse(await req.json().catch(() => ({})));

  const sub = user.subscriptions[0];
  if (!sub || !["TRIALING", "ACTIVE", "PAST_DUE"].includes(sub.status)) {
    return NextResponse.json({ error: "Ingen aktivt abonnement å si opp." }, { status: 400 });
  }

  const updated = await cancelSubscription(sub, user, reason ?? null);
  return NextResponse.json({ ok: true, accessUntil: updated.periodEnd });
}

export async function DELETE() {
  // Resume a cancellation that has not yet lapsed.
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  const sub = user.subscriptions[0];
  if (!sub || sub.status !== "CANCELED" || sub.periodEnd < new Date()) {
    return NextResponse.json({ error: "Abonnementet kan ikke gjenopptas." }, { status: 400 });
  }
  const resumed = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: sub.renewals > 0 ? "ACTIVE" : "TRIALING", canceledAt: null, cancelAt: null },
  });
  return NextResponse.json({ ok: true, status: resumed.status });
}
