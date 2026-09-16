import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/** GDPR article 15/20: everything we hold about the requester, as JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });

  const [subscriptions, payments, searches, emails] = await Promise.all([
    prisma.subscription.findMany({ where: { userId: user.id } }),
    prisma.payment.findMany({ where: { userId: user.id } }),
    prisma.search.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.emailLog.findMany({ where: { userId: user.id }, select: { type: true, subject: true, createdAt: true } }),
  ]);

  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), account: { email: user.email, createdAt: user.createdAt }, subscriptions, payments, searches, emails },
    null,
    2
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="bilfunn-mine-data.json"',
    },
  });
}
