export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession, destroySession } from "@/lib/session";
import { sha256, clientIp, hashIp, safeEqual } from "@/lib/crypto";
import { enforceRateLimit as rateLimit } from "@/lib/rateLimit";
import { endpoint, HttpError, jsonBody } from "@/lib/http";
export const runtime = "nodejs";
export const POST = endpoint(async (req) => {
  const data = await jsonBody(
    req,
    z
      .object({
        email: z.string().email().max(254).optional(),
        code: z
          .string()
          .regex(/^\d{6}$/)
          .optional(),
        token: z.string().min(32).max(128).optional(),
      })
      .strict(),
  );
  if (
    !(await rateLimit(`verify:${hashIp(clientIp(req.headers))}`, 30, 600_000))
      .ok
  )
    throw new HttpError(429, "too_many_attempts");
  const email = data.email?.trim().toLowerCase();
  if (!data.token && (!email || !data.code))
    throw new HttpError(400, "invalid_input");
  if (
    email &&
    !(await rateLimit(`verify-email:${sha256(email)}`, 10, 600_000)).ok
  )
    throw new HttpError(429, "too_many_attempts");
  const userId = await prisma.$transaction(async (tx) => {
    const lock = data.token ? sha256(data.token) : email!;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lock}))`;
    const record = await tx.loginToken.findFirst({
      where: {
        ...(data.token ? { tokenHash: sha256(data.token) } : { email }),
        usedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!record?.userId) return null;
    const claimed = await tx.loginToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        attempts: { lt: 5 },
        expiresAt: { gt: new Date() },
      },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) return null;
    if (
      !data.token &&
      !safeEqual(
        record.codeHash,
        sha256(`${email}:${data.code}:${env.sessionSecret}`),
      )
    )
      return null;
    const consumed = await tx.loginToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) return null;
    const updated = await tx.user.updateMany({
      where: { id: record.userId, deletedAt: null },
      data: { lastLoginAt: new Date(), emailVerifiedAt: new Date() },
    });
    return updated.count === 1 ? record.userId : null;
  });
  if (!userId) throw new HttpError(401, "invalid_or_expired_code");
  await destroySession();
  await createSession(userId);
  return NextResponse.json({ ok: true });
});
