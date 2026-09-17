import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
    set: (key: string, value: string) => {
      jar.set(key, value);
    },
  }),
}));
import { prisma } from "../../src/lib/db";
import { env } from "../../src/lib/env";
import { sha256 } from "../../src/lib/crypto";
import { POST as verify } from "../../src/app/api/auth/verify/route";
import { POST as checkout } from "../../src/app/api/checkout/route";
import {
  createSession,
  getUserId,
  destroySession,
} from "../../src/lib/session";
import { rateLimit } from "../../src/lib/rateLimit";
import { applyPaid, once } from "../../src/lib/payments/events";
import { consumeSearch } from "../../src/lib/billing";
function request(data: unknown) {
  return new Request("http://localhost:3100/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes("/sk_test"))
    throw new Error("Dedicated test DB required");
  await prisma.config.upsert({
    where: { id: "default" },
    update: { introSearchLimit: 3 },
    create: { id: "default", introSearchLimit: 3 },
  });
});
beforeEach(async () => {
  jar.clear();
  await prisma.outbox.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.search.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.checkout.deleteMany();
  await prisma.loginToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rateLimit.deleteMany();
});
afterAll(() => prisma.$disconnect());
describe("authentication", () => {
  it("does not turn an email into a checkout session", async () => {
    const user = await prisma.user.create({
      data: { email: "admin@example.test", role: "ADMIN" },
    });
    const response = await checkout(
      request({
        email: user.email,
        method: "card",
        plate: "AB12345",
        accepted: true,
      }),
    );
    expect(response.status).toBe(401);
    expect(await prisma.session.count()).toBe(0);
  });
  it("consumes a login challenge exactly once concurrently", async () => {
    const user = await prisma.user.create({
      data: { email: "user@example.test" },
    });
    const token = "t".repeat(43);
    await prisma.loginToken.create({
      data: {
        email: user.email,
        userId: user.id,
        codeHash: "unused",
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => verify(request({ token }))),
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await prisma.session.count()).toBe(1);
  });
  it("locks a code challenge after five bad attempts", async () => {
    const user = await prisma.user.create({
      data: { email: "user@example.test" },
    });
    await prisma.loginToken.create({
      data: {
        email: user.email,
        userId: user.id,
        codeHash: sha256(`${user.email}:123456:${env.sessionSecret}`),
        tokenHash: sha256("token"),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    for (let i = 0; i < 5; i++)
      expect(
        (await verify(request({ email: user.email, code: "000000" }))).status,
      ).toBe(401);
    expect(
      (await verify(request({ email: user.email, code: "123456" }))).status,
    ).toBe(401);
  });
  it("revokes sessions server-side", async () => {
    const user = await prisma.user.create({
      data: { email: "user@example.test", emailVerifiedAt: new Date() },
    });
    await createSession(user.id);
    expect(await getUserId()).toBe(user.id);
    await destroySession();
    expect(await getUserId()).toBeNull();
  });
});
describe("transactional accounting", () => {
  it("bounds concurrent rate limits", async () => {
    const results = await Promise.all(
      Array.from({ length: 30 }, () => rateLimit("race", 5, 60000)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(5);
  });
  it("ignores duplicate event and payment deliveries", async () => {
    const user = await prisma.user.create({
      data: { email: "user@example.test", emailVerifiedAt: new Date() },
    });
    const c = await prisma.checkout.create({
      data: {
        userId: user.id,
        provider: "STRIPE",
        plate: "AB12345",
        introOre: 300,
        renewalOre: 24900,
        introDays: 3,
        vatBps: 2500,
      },
    });
    const payment = {
      id: "invoice1",
      amount: 300,
      initial: true,
      start: new Date(),
      end: new Date(Date.now() + 3 * 86400000),
      subscriptionId: "sub1",
    };
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        once("STRIPE", `event${i % 2}`, (tx) => applyPaid(tx, c, payment)),
      ),
    );
    expect(await prisma.payment.count()).toBe(1);
    expect(await prisma.subscription.count()).toBe(1);
    expect((await prisma.payment.findFirst())?.receiptNumber).toMatch(
      /^SK-\d+$/,
    );
  });
  it("does not renew twice or move periods backwards", async () => {
    const user = await prisma.user.create({
      data: { email: "user@example.test" },
    });
    const c = await prisma.checkout.create({
      data: {
        userId: user.id,
        provider: "STRIPE",
        plate: "AB12345",
        introOre: 300,
        renewalOre: 24900,
        introDays: 3,
        vatBps: 2500,
      },
    });
    const start = new Date(),
      end = new Date(Date.now() + 33 * 86400000);
    await once("STRIPE", "renew1", (tx) =>
      applyPaid(tx, c, {
        id: "inv-renew",
        amount: 24900,
        initial: false,
        start,
        end,
        subscriptionId: "sub1",
      }),
    );
    await once("STRIPE", "late-intro", (tx) =>
      applyPaid(tx, c, {
        id: "inv-intro",
        amount: 300,
        initial: true,
        start,
        end: new Date(Date.now() + 3 * 86400000),
        subscriptionId: "sub1",
      }),
    );
    const sub = await prisma.subscription.findFirstOrThrow();
    expect(sub.periodEnd.toISOString()).toBe(end.toISOString());
    expect(sub.renewals).toBe(1);
  });
  it("consumes paid allowance atomically", async () => {
    const user = await prisma.user.create({
      data: { email: "user@example.test" },
    });
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        status: "TRIALING",
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000),
      },
    });
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, (_, i) =>
        consumeSearch(user.id, sub, `AB${10000 + i}`),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } }))
        .searchesThisPeriod,
    ).toBe(3);
  });
});

describe("payment failure recovery", () => {
  it("rolls back an event with an unexpected amount so it can be retried", async () => {
    const user = await prisma.user.create({
      data: { email: "amount@example.test" },
    });
    const c = await prisma.checkout.create({
      data: {
        userId: user.id,
        provider: "STRIPE",
        plate: "AB12345",
        introOre: 300,
        renewalOre: 24900,
        introDays: 3,
        vatBps: 2500,
      },
    });
    const payment = {
      id: "mismatch",
      amount: 0,
      initial: true,
      start: new Date(),
      end: new Date(Date.now() + 86400000),
    };
    await expect(
      once("STRIPE", "retryable", (tx) => applyPaid(tx, c, payment)),
    ).rejects.toThrow();
    expect(await prisma.webhookEvent.count()).toBe(0);
    expect(await prisma.payment.count()).toBe(0);
    await once("STRIPE", "retryable", (tx) =>
      applyPaid(tx, c, { ...payment, amount: 300 }),
    );
    expect(await prisma.payment.count()).toBe(1);
  });
  it("queues provider cancellation when payment arrives after account deletion", async () => {
    const user = await prisma.user.create({
      data: { email: "deleted@example.test", deletedAt: new Date() },
    });
    const c = await prisma.checkout.create({
      data: {
        userId: user.id,
        provider: "STRIPE",
        plate: "AB12345",
        introOre: 300,
        renewalOre: 24900,
        introDays: 3,
        vatBps: 2500,
      },
    });
    await once("STRIPE", "deleted-payment", (tx) =>
      applyPaid(tx, c, {
        id: "late",
        amount: 300,
        initial: true,
        start: new Date(),
        end: new Date(Date.now() + 86400000),
        subscriptionId: "sub-deleted",
      }),
    );
    expect((await prisma.subscription.findFirstOrThrow()).cancelPending).toBe(
      true,
    );
    expect(await prisma.outbox.count({ where: { kind: "cancel" } })).toBe(1);
  });
  it("honours free repeat searches after the allowance is exhausted", async () => {
    const user = await prisma.user.create({
      data: { email: "repeat@example.test" },
    });
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        status: "TRIALING",
        periodStart: new Date(Date.now() - 10000),
        periodEnd: new Date(Date.now() + 86400000),
      },
    });
    for (const plate of ["AB12345", "AB12346", "AB12347"])
      await consumeSearch(user.id, sub, plate);
    expect(await consumeSearch(user.id, sub, "AB12345")).toBe(false);
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } }))
        .searchesThisPeriod,
    ).toBe(3);
  });
});

describe("administrative and deletion boundaries", () => {
  it("requires administrator MFA and prevents TOTP replay", async () => {
    const OTPAuth = await import("otpauth"),
      { seal } = await import("../../src/lib/seal"),
      { requireAdmin } = await import("../../src/lib/session"),
      { POST: mfa } = await import("../../src/app/api/auth/mfa/route");
    const otp = new OTPAuth.TOTP({
      secret: new OTPAuth.Secret({ size: 20 }),
      digits: 6,
      period: 30,
    });
    const user = await prisma.user.create({
      data: {
        email: "mfa@example.test",
        emailVerifiedAt: new Date(),
        role: "ADMIN",
        mfaSecret: seal(otp.secret.base32),
      },
    });
    await createSession(user.id);
    expect(await requireAdmin()).toBeNull();
    const code = otp.generate();
    expect((await mfa(request({ code }))).status).toBe(200);
    expect((await requireAdmin())?.id).toBe(user.id);
    expect((await mfa(request({ code }))).status).toBe(401);
  });
  it("requires recent authentication for deletion and erases pending email data", async () => {
    const { POST: remove } =
        await import("../../src/app/api/account/delete/route"),
      { enqueue } = await import("../../src/lib/jobs");
    const user = await prisma.user.create({
      data: { email: "erase@example.test", emailVerifiedAt: new Date() },
    });
    await createSession(user.id);
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { createdAt: new Date(Date.now() - 11 * 60000) },
    });
    expect((await remove(request({}))).status).toBe(403);
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { createdAt: new Date() },
    });
    await enqueue(
      "email",
      {
        userId: user.id,
        to: user.email,
        type: "login_code",
        ctx: { code: "123456" },
      },
      "erase-email",
    );
    await prisma.ticket.create({
      data: {
        name: "Private",
        email: user.email,
        category: "account",
        message: "Private message",
      },
    });
    expect((await remove(request({}))).status).toBe(202);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.ticket.count({ where: { email: user.email } })).toBe(0);
    expect(
      (await prisma.outbox.findUniqueOrThrow({ where: { key: "erase-email" } }))
        .payload,
    ).toEqual({});
  });
});
