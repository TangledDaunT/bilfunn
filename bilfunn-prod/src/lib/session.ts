import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "./db";
import { randomToken, sha256 } from "./crypto";
import { HttpError } from "./http";
const COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-sk_session" : "sk_session";
const MAX_AGE = 60 * 60 * 24 * 7;
/** Issue an opaque bearer cookie; persist only its hash so database reads cannot recreate login credentials. */
export async function createSession(userId: string) {
  const token = randomToken();
  await prisma.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + MAX_AGE * 1000),
    },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}
export const getSession = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 128) return null;
  return prisma.session.findFirst({
    where: {
      id: sha256(token),
      expiresAt: { gt: new Date() },
      user: { deletedAt: null },
    },
  });
});
export async function destroySession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  (await cookies()).set(COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}
export async function getUserId() {
  return (await getSession())?.userId ?? null;
}
export const getCurrentUser = cache(async () => {
  const id = await getUserId();
  if (!id) return null;
  return prisma.user.findFirst({
    where: { id, deletedAt: null, emailVerifiedAt: { not: null } },
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
});
// An email allowlist is used only by the explicit seed/provisioning command.
export async function requireAdmin() {
  const [user, session] = await Promise.all([getCurrentUser(), getSession()]);
  if (
    !user ||
    user.role !== "ADMIN" ||
    !user.mfaSecret ||
    !session?.mfaAt ||
    Date.now() - session.mfaAt.getTime() > 15 * 60_000
  )
    return null;
  return user;
}
/** Reject missing or stale authentication before exporting or deleting personal account data. */
export async function requireRecentUser() {
  const [user, session] = await Promise.all([getCurrentUser(), getSession()]);
  if (!user) throw new HttpError(401, "authentication_required");
  if (!session || Date.now() - session.createdAt.getTime() > 10 * 60_000)
    throw new HttpError(403, "recent_authentication_required");
  return user;
}
