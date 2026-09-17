export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env, demoLoginConfigured } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { clientIp, hashIp, sha256 } from "@/lib/crypto";
import { enforceRateLimit as rateLimit } from "@/lib/rateLimit";
import { endpoint, HttpError, jsonBody } from "@/lib/http";

export const runtime = "nodejs";

export const POST = endpoint(async (req) => {
  const { email: rawEmail, password } = await jsonBody(
    req,
    z
      .object({
        email: z.string().trim().email().max(254),
        password: z.string().min(16).max(256),
      })
      .strict(),
  );
  const email = rawEmail.toLowerCase();
  const limits = await Promise.all([
    rateLimit(`password:ip:${hashIp(clientIp(req.headers))}`, 8, 3600_000),
    rateLimit(`password:email:${sha256(email)}`, 5, 3600_000),
  ]);
  if (limits.some((limit) => !limit.ok))
    throw new HttpError(429, "too_many_attempts");
  if (!demoLoginConfigured()) throw new HttpError(404, "not_found");

  const emailMatches = email === env.demoLogin.email;
  const passwordMatches = await verifyPassword(
    password,
    env.demoLogin.passwordHash,
  );
  if (!emailMatches || !passwordMatches)
    throw new HttpError(401, "invalid_credentials");

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing?.role === "ADMIN")
      throw new HttpError(403, "password_login_not_allowed");
    const account = await tx.user.upsert({
      where: { email },
      update: {
        deletedAt: null,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
      create: {
        email,
        role: "CUSTOMER",
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    });
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60_000);
    await tx.subscription.upsert({
      where: { checkoutId: "owner-demo-login" },
      update: {
        userId: account.id,
        status: "ACTIVE",
        provider: "MOCK",
        periodStart: new Date(),
        periodEnd,
        canceledAt: null,
        cancelAt: null,
        endedAt: null,
        cancelPending: false,
      },
      create: {
        userId: account.id,
        status: "ACTIVE",
        provider: "MOCK",
        priceOre: 0,
        periodEnd,
        checkoutId: "owner-demo-login",
      },
    });
    return account;
  });
  await destroySession();
  await createSession(user.id);
  return NextResponse.json({ ok: true });
});
