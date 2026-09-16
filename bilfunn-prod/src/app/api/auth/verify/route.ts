import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { sha256 } from "@/lib/crypto";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = z
    .object({ email: z.string().email().optional(), code: z.string().optional(), token: z.string().optional() })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });

  const { email, code, token } = parsed.data;
  const where = token
    ? { tokenHash: sha256(token) }
    : email && code
    ? { email: email.trim().toLowerCase(), codeHash: sha256(code) }
    : null;
  if (!where) return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });

  const record = await prisma.loginToken.findFirst({
    where: { ...where, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record || !record.userId) {
    return NextResponse.json({ error: "Koden er feil eller utløpt." }, { status: 401 });
  }

  await prisma.loginToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  await prisma.user.update({ where: { id: record.userId }, data: { lastLoginAt: new Date() } });
  await createSession(record.userId);
  await track("login_success", {}, { userId: record.userId });
  return NextResponse.json({ ok: true });
}
