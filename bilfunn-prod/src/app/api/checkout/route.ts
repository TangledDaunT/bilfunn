import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { env } from "@/lib/env";
import { getProvider } from "@/lib/payments";
import { createSession } from "@/lib/session";
import { recordPayment, startSubscription } from "@/lib/billing";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";
import { rateLimit } from "@/lib/rateLimit";
import { clientIp, hashIp } from "@/lib/crypto";
import { normalizePlate, isValidPlate } from "@/lib/plate";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(254),
  method: z.enum(["vipps", "card"]),
  plate: z.string().min(2).max(9),
});

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = await rateLimit(`checkout:${hashIp(ip)}`, 10, 3600_000);
  if (!limit.ok) return NextResponse.json({ error: "For mange forsøk. Prøv igjen senere." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldige opplysninger." }, { status: 400 });

  const plate = normalizePlate(parsed.data.plate);
  if (!isValidPlate(plate)) return NextResponse.json({ error: "Ugyldig registreringsnummer." }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const cfg = await getConfig();

  const user = await prisma.user.upsert({
    where: { email },
    update: { deletedAt: null },
    create: { email, role: env.adminEmails.includes(email) ? "ADMIN" : "CUSTOMER" },
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const existing = user.subscriptions?.[0];
  if (existing && ["TRIALING", "ACTIVE", "PAST_DUE"].includes(existing.status)) {
    await createSession(user.id);
    return NextResponse.json({ next: `/rapport/${plate}` });
  }

  const provider = getProvider(parsed.data.method);
  await track("checkout_started", { plate, method: parsed.data.method, provider: provider.name }, { userId: user.id });

  try {
    const started = await provider.startCheckout({
      userId: user.id,
      email,
      introPriceOre: cfg.introPriceOre,
      renewalPriceOre: cfg.renewalPriceOre,
      introDays: cfg.introDays,
      plate,
      returnUrl: `${env.baseUrl}/kvittering?nr=${plate}`,
    });

    if (started.redirectUrl) {
      // Real provider: the subscription is created when the webhook confirms payment.
      await createSession(user.id);
      return NextResponse.json({ redirectUrl: started.redirectUrl });
    }

    // Mock provider: complete inline so the whole flow is testable without keys.
    const sub = await startSubscription({
      user,
      provider: provider.name,
      paymentBrand: parsed.data.method === "vipps" ? "vipps" : "card",
    });
    const payment = await recordPayment({
      userId: user.id,
      subscriptionId: sub.id,
      kind: "INTRO",
      status: "SUCCEEDED",
      amountOre: cfg.introPriceOre,
      provider: provider.name,
    });
    await sendEmail(
      "payment_receipt",
      email,
      { amountOre: payment.amountOre, vatOre: payment.vatOre, receipt: payment.receiptNumber, at: payment.createdAt },
      user.id
    );
    await createSession(user.id);
    await track("checkout_completed", { plate, amountOre: cfg.introPriceOre }, { userId: user.id });
    return NextResponse.json({ next: `/kvittering?nr=${plate}` });
  } catch (err: any) {
    await track("checkout_error", { message: String(err?.message ?? err) }, { userId: user.id });
    return NextResponse.json({ error: "Betalingen kunne ikke startes. Prøv en annen betalingsmåte." }, { status: 502 });
  }
}
