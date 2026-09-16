import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { clientIp, hashIp } from "@/lib/crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limit = await rateLimit(`contact:${hashIp(clientIp(req.headers))}`, 5, 3600_000);
  if (!limit.ok) return NextResponse.json({ error: "For mange meldinger. Prøv igjen senere." }, { status: 429 });

  const parsed = z
    .object({
      name: z.string().min(1).max(120),
      email: z.string().email().max(254),
      category: z.string().max(80),
      message: z.string().min(10).max(4000),
      website: z.string().max(0).optional(), // honeypot
    })
    .safeParse(await req.json().catch(() => ({})));

  if (!parsed.success) return NextResponse.json({ error: "Kontroller feltene og prøv igjen." }, { status: 400 });

  await prisma.ticket.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      category: parsed.data.category,
      message: parsed.data.message,
    },
  });
  return NextResponse.json({ ok: true });
}
