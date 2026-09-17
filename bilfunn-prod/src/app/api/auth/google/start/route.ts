import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { endpoint, HttpError } from "@/lib/http";
import { randomToken, sha256, hashIp, clientIp } from "@/lib/crypto";
import { getSession } from "@/lib/session";
import { enforceRateLimit as rateLimit } from "@/lib/rateLimit";
import {
  googleConfigured,
  googleRedirect,
  oauthCookie,
  safeLoginNext,
} from "@/lib/google-auth";
export const dynamic = "force-dynamic";
export const GET = endpoint(async (req) => {
  if (!googleConfigured())
    return NextResponse.redirect(
      new URL("/logg-inn?error=google_unavailable", env.baseUrl),
    );
  if (req.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "forbidden_origin");
  if (
    !(await rateLimit(`google:${hashIp(clientIp(req.headers))}`, 10, 600000)).ok
  )
    throw new HttpError(429, "too_many_attempts");
  const state = randomToken(),
    nonce = randomToken(),
    verifier = randomToken();
  const session = await getSession();
  const jar = await cookies();
  const old = jar.get(oauthCookie)?.value;
  if (old) await prisma.oAuthAttempt.deleteMany({ where: { id: sha256(old) } });
  // Expired attempts are indexed and deleted in bounded batches.
  const expired = await prisma.oAuthAttempt.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { id: true },
    take: 100,
  });
  if (expired.length)
    await prisma.oAuthAttempt.deleteMany({
      where: { id: { in: expired.map((x) => x.id) } },
    });
  await prisma.oAuthAttempt.create({
    data: {
      id: sha256(state),
      nonce,
      verifier,
      next: safeLoginNext(new URL(req.url).searchParams.get("next")),
      userId:
        session && Date.now() - session.createdAt.getTime() < 600000
          ? session.userId
          : null,
      expiresAt: new Date(Date.now() + 600000),
    },
  });
  jar.set(oauthCookie, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: googleRedirect(),
    response_type: "code",
    scope: "openid email",
    state,
    nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});
