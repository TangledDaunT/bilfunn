export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import * as OTPAuth from "otpauth";
import { prisma } from "@/lib/db";
import { getSession, requireRecentUser } from "@/lib/session";
import { unseal } from "@/lib/seal";
import { enforceRateLimit as rateLimit } from "@/lib/rateLimit";
import { endpoint, HttpError, jsonBody } from "@/lib/http";
export const POST = endpoint(async (req) => {
  const user = await requireRecentUser();
  if (user.role !== "ADMIN" || !user.mfaSecret)
    throw new HttpError(403, "mfa_not_provisioned");
  if (!(await rateLimit(`mfa:${user.id}`, 5, 300_000)).ok)
    throw new HttpError(429, "too_many_attempts");
  const { code } = await jsonBody(
    req,
    z.object({ code: z.string().regex(/^\d{6}$/) }).strict(),
  );
  const now = Date.now();
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(unseal(user.mfaSecret)),
    digits: 6,
    period: 30,
  });
  const delta = totp.validate({ token: code, window: 1, timestamp: now });
  if (delta === null) throw new HttpError(401, "invalid_code");
  const step = BigInt(Math.floor(now / 30_000) + delta);
  const changed = await prisma.user.updateMany({
    where: {
      id: user.id,
      OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: step } }],
    },
    data: { mfaLastStep: step },
  });
  if (!changed.count) throw new HttpError(401, "code_already_used");
  await prisma.session.update({
    where: { id: (await getSession())!.id },
    data: { mfaAt: new Date() },
  });
  return NextResponse.json({ ok: true });
});
