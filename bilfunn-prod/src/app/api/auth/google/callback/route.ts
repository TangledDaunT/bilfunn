import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sha256, safeEqual } from "@/lib/crypto";
import { getSession, createSession, destroySession } from "@/lib/session";
import {
  googleConfigured,
  exchangeGoogleCode,
  oauthCookie,
} from "@/lib/google-auth";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/logg-inn?error=${reason}`, env.baseUrl));
  const jar = await cookies();
  const cookie = jar.get(oauthCookie)?.value;
  const query = new URL(req.url).searchParams,
    state = query.get("state");
  if (
    !googleConfigured() ||
    !cookie ||
    !state ||
    state.length > 128 ||
    !safeEqual(cookie, state)
  )
    return fail("google_failed");
  jar.set(oauthCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  try {
    const attempt = await prisma.$transaction(async (tx) => {
      const row = await tx.oAuthAttempt.findUnique({
        where: { id: sha256(state) },
      });
      if (!row || row.expiresAt < new Date()) return null;
      const deleted = await tx.oAuthAttempt.deleteMany({
        where: { id: row.id },
      });
      return deleted.count === 1 ? row : null;
    });
    if (!attempt) return fail("google_failed");
    if (query.has("error")) return fail("google_cancelled");
    const code = query.get("code");
    if (!code || code.length > 4096) return fail("google_failed");
    const identity = await exchangeGoogleCode(
      code,
      attempt.verifier,
      attempt.nonce,
    );
    const session = await getSession();
    const linkUser =
      attempt.userId &&
      session?.userId === attempt.userId &&
      Date.now() - session.createdAt.getTime() < 600000
        ? attempt.userId
        : null;
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${identity.email}))`;
      const existing = await tx.externalIdentity.findUnique({
        where: {
          provider_subject: { provider: "google", subject: identity.subject },
        },
        include: { user: true },
      });
      if (existing) {
        if (
          existing.user.deletedAt ||
          (attempt.userId && existing.userId !== linkUser)
        )
          return { error: "google_failed" };
        return { id: existing.userId };
      }
      const user = await tx.user.findUnique({
        where: { email: identity.email },
      });
      if (attempt.userId && !linkUser) return { error: "google_failed" };
      if (user && (user.deletedAt || user.id !== linkUser))
        return { error: "link_required" };
      if (linkUser && (!user || user.id !== linkUser))
        return { error: "link_required" };
      const target =
        user ??
        (await tx.user.create({
          data: {
            email: identity.email,
            emailVerifiedAt: new Date(),
            role: "CUSTOMER",
          },
        }));
      await tx.externalIdentity.create({
        data: {
          provider: "google",
          subject: identity.subject,
          userId: target.id,
        },
      });
      return { id: target.id };
    });
    if (!result.id) return fail(result.error ?? "google_failed");
    await prisma.user.update({
      where: { id: result.id },
      data: { lastLoginAt: new Date(), emailVerifiedAt: new Date() },
    });
    await destroySession();
    await createSession(result.id);
    const response = NextResponse.redirect(new URL(attempt.next, env.baseUrl));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return fail("google_failed");
  }
}
