import { beforeAll, beforeEach, afterAll, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => new Map<string, string>());
const exchange = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
    set: (key: string, value: string) => jar.set(key, value),
  }),
}));
vi.mock("../../src/lib/google-auth", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  exchangeGoogleCode: exchange,
}));
import { prisma } from "../../src/lib/db";
import { env } from "../../src/lib/env";
import { sha256 } from "../../src/lib/crypto";
import { createSession } from "../../src/lib/session";
import { GET } from "../../src/app/api/auth/google/callback/route";
const state = "isolated-google-state-test-000000000000000000";
const request = () =>
  new Request(
    `http://localhost:3100/api/auth/google/callback?state=${state}&code=test-code`,
  );
async function attempt(userId?: string) {
  jar.set("sk_oauth", state);
  await prisma.oAuthAttempt.create({
    data: {
      id: sha256(state),
      nonce: "nonce",
      verifier: "verifier",
      next: "/konto",
      userId,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
}
beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("/sk_test"))
    throw new Error("Test DB required");
  env.google.clientId = "test-id";
  env.google.clientSecret = "test-secret";
});
beforeEach(async () => {
  jar.clear();
  exchange.mockReset();
  await prisma.oAuthAttempt.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@google-qa.test" } },
  });
  exchange.mockResolvedValue({
    subject: "google-test-subject",
    email: "new@google-qa.test",
  });
});
afterAll(async () => {
  await prisma.oAuthAttempt.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@google-qa.test" } },
  });
  await prisma.$disconnect();
});
it("creates a customer session and rejects callback replay", async () => {
  await attempt();
  const res = await GET(request());
  expect(res.headers.get("location")).toBe("http://localhost:3100/konto");
  const u = await prisma.user.findUniqueOrThrow({
    where: { email: "new@google-qa.test" },
  });
  expect(u.role).toBe("CUSTOMER");
  expect(u.emailVerifiedAt).not.toBeNull();
  expect(await prisma.session.count({ where: { userId: u.id } })).toBe(1);
  jar.set("sk_oauth", state);
  expect((await GET(request())).headers.get("location")).toContain(
    "google_failed",
  );
  expect(exchange).toHaveBeenCalledTimes(1);
});
it("does not merge a matching email without existing-account authentication", async () => {
  const u = await prisma.user.create({
    data: { email: "new@google-qa.test", role: "ADMIN" },
  });
  await attempt();
  expect((await GET(request())).headers.get("location")).toContain(
    "link_required",
  );
  expect(await prisma.session.count({ where: { userId: u.id } })).toBe(0);
  expect(await prisma.externalIdentity.count({ where: { userId: u.id } })).toBe(
    0,
  );
});
it("links only after recent authentication of the same account", async () => {
  const u = await prisma.user.create({
    data: { email: "new@google-qa.test", emailVerifiedAt: new Date() },
  });
  await createSession(u.id);
  await attempt(u.id);
  expect((await GET(request())).headers.get("location")).toBe(
    "http://localhost:3100/konto",
  );
  expect(await prisma.externalIdentity.count({ where: { userId: u.id } })).toBe(
    1,
  );
});
it("rejects mismatched browser state before contacting Google", async () => {
  await attempt();
  jar.set("sk_oauth", "wrong-state");
  expect((await GET(request())).headers.get("location")).toContain(
    "google_failed",
  );
  expect(exchange).not.toHaveBeenCalled();
});
it("rejects expired transactions", async () => {
  await attempt();
  await prisma.oAuthAttempt.updateMany({ data: { expiresAt: new Date(0) } });
  expect((await GET(request())).headers.get("location")).toContain(
    "google_failed",
  );
  expect(exchange).not.toHaveBeenCalled();
});

it("rejects provider verification failures without creating a session", async () => {
  await attempt();
  exchange.mockRejectedValueOnce(new Error("invalid signature"));
  expect((await GET(request())).headers.get("location")).toContain(
    "google_failed",
  );
  expect(
    await prisma.user.count({ where: { email: "new@google-qa.test" } }),
  ).toBe(0);
  expect(
    await prisma.oAuthAttempt.count({ where: { id: sha256(state) } }),
  ).toBe(0);
});
it("consumes cancelled attempts without contacting Google", async () => {
  await attempt();
  const response = await GET(
    new Request(
      `http://localhost:3100/api/auth/google/callback?state=${state}&error=access_denied`,
    ),
  );
  expect(response.headers.get("location")).toContain("google_cancelled");
  expect(exchange).not.toHaveBeenCalled();
  expect(
    await prisma.oAuthAttempt.count({ where: { id: sha256(state) } }),
  ).toBe(0);
});
