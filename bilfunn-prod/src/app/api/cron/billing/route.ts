import { NextResponse } from "next/server";
import { runBillingCycle } from "@/lib/billing";
import { pruneRateLimits } from "@/lib/rateLimit";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron hits this hourly (see vercel.json). Protected by CRON_SECRET;
 * Vercel's scheduler sends it as a bearer token.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await runBillingCycle();
  await pruneRateLimits();

  // Retention: login tokens are short-lived, search history is kept 12 months.
  await prisma.loginToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
  await prisma.search.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 365 * 86400000) } },
  });

  return NextResponse.json({ ok: true, ...summary, at: new Date().toISOString() });
}
