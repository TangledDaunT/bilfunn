export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env, emailConfigured } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import {
  randomCode,
  randomToken,
  sha256,
  clientIp,
  hashIp,
} from "@/lib/crypto";
import { enforceRateLimit as rateLimit } from "@/lib/rateLimit";
import { endpoint, HttpError, jsonBody } from "@/lib/http";
export const runtime = "nodejs";
export const POST = endpoint(async (req) => {
  const { email: raw } = await jsonBody(
    req,
    z.object({ email: z.string().trim().email().max(254) }).strict(),
  );
  const email = raw.toLowerCase();
  const limits = await Promise.all([
    rateLimit(`auth:ip:${hashIp(clientIp(req.headers))}`, 8, 3600_000),
    rateLimit(`auth:email:${sha256(email)}`, 5, 3600_000),
  ]);
  if (limits.some((l) => !l.ok)) throw new HttpError(429, "too_many_attempts");
  if (!emailConfigured()) throw new HttpError(503, "email_unavailable");
  const code = randomCode(),
    token = randomToken();
  // Serialize issuance per address. Signup does not grant any role or access.
  const challenge = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`;
    const user = await tx.user.upsert({
      where: { email },
      update: {},
      create: { email, role: "CUSTOMER" },
    });
    if (user.deletedAt) return null;
    await tx.loginToken.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });
    return tx.loginToken.create({
      data: {
        email,
        userId: user.id,
        codeHash: sha256(`${email}:${code}:${env.sessionSecret}`),
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
  });
  if (challenge)
    await sendEmail(
      "login_code",
      email,
      { code, link: `${env.baseUrl}/logg-inn?token=${token}` },
      challenge.userId ?? undefined,
      `login:${challenge.id}`,
    );
  return NextResponse.json({ ok: true });
});
