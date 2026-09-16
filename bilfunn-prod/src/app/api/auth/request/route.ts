import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { randomCode, randomToken, sha256, clientIp, hashIp } from "@/lib/crypto";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = await rateLimit(`auth:${hashIp(ip)}`, 8, 3600_000);
  if (!limit.ok) return NextResponse.json({ error: "For mange forsøk. Prøv igjen om en time." }, { status: 429 });

  const parsed = z.object({ email: z.string().email().max(254) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Skriv inn en gyldig e-postadresse." }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always answer the same way: never reveal whether an account exists.
  if (user) {
    const code = randomCode();
    const token = randomToken();
    await prisma.loginToken.create({
      data: {
        email,
        userId: user.id,
        codeHash: sha256(code),
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    await sendEmail("login_code", email, { code, link: `${env.baseUrl}/logg-inn?token=${token}` }, user.id);
  }

  return NextResponse.json({ ok: true });
}
