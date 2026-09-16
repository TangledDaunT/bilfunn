import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { destroySession, getCurrentUser } from "@/lib/session";
import { cancelSubscription } from "@/lib/billing";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * GDPR erasure. Subscriptions are stopped, searches removed and the account
 * anonymised. Payments survive in anonymised form because the Bookkeeping Act
 * requires accounting records to be retained.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });

  const sub = user.subscriptions[0];
  if (sub && ["TRIALING", "ACTIVE", "PAST_DUE"].includes(sub.status)) {
    await cancelSubscription(sub, user, "account_deleted");
  }

  await sendEmail("account_deleted", user.email, {}, null);
  await prisma.search.deleteMany({ where: { userId: user.id } });
  await prisma.loginToken.deleteMany({ where: { userId: user.id } });
  await prisma.emailLog.updateMany({ where: { userId: user.id }, data: { userId: null, to: "[slettet]" } });
  await prisma.payment.updateMany({ where: { userId: user.id }, data: {} });
  await prisma.user.update({
    where: { id: user.id },
    data: { email: `slettet+${user.id}@bilfunn.invalid`, deletedAt: new Date() },
  });

  await track("account_deleted", {});
  destroySession();
  return NextResponse.json({ ok: true });
}
