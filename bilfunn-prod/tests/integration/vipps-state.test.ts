import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { prisma } from "../../src/lib/db";
import { once } from "../../src/lib/payments/events";
import { reconcileVippsCharge } from "../../src/lib/payments/vipps-state";
beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("/sk_test"))
    throw new Error("Dedicated test DB required");
});
beforeEach(async () => {
  await prisma.outbox.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.search.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.checkout.deleteMany();
  await prisma.loginToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(() => prisma.$disconnect());
async function checkout() {
  const u = await prisma.user.create({ data: { email: "vipps@example.test" } });
  return prisma.checkout.create({
    data: {
      userId: u.id,
      provider: "VIPPS",
      subscriptionId: "agr_1",
      plate: "AB12345",
      introOre: 300,
      renewalOre: 24900,
      introDays: 3,
      vatBps: 2500,
    },
  });
}
const charge = {
  id: "chr_1",
  agreementId: "agr_1",
  type: "INITIAL",
  status: "CHARGED",
  currency: "NOK",
  amount: 300,
  due: "2026-09-17T00:00:00Z",
  summary: { captured: 300, refunded: 0 },
  history: [
    { occurred: "2026-09-17T09:00:00Z", event: "CAPTURE", success: true },
  ],
};
it("does not grant access for an active agreement with an uncaptured charge", async () => {
  const c = await checkout();
  await once("VIPPS", "active", (tx) =>
    reconcileVippsCharge(tx, c, "ACTIVE", {
      ...charge,
      status: "PENDING",
      summary: { captured: 0, refunded: 0 },
      history: [],
    }),
  );
  expect(await prisma.subscription.count()).toBe(0);
});
it("records captured amounts and provider timestamps, including refund-before-capture delivery", async () => {
  const c = await checkout();
  await once("VIPPS", "refund-first", (tx) =>
    reconcileVippsCharge(tx, c, "ACTIVE", {
      ...charge,
      status: "PARTIALLY_REFUNDED",
      summary: { captured: 300, refunded: 100 },
    }),
  );
  await once("VIPPS", "capture-later", (tx) =>
    reconcileVippsCharge(tx, c, "ACTIVE", charge),
  );
  const pay = await prisma.payment.findFirstOrThrow();
  expect(pay.amountOre).toBe(300);
  expect(pay.refundedOre).toBe(100);
  expect(await prisma.payment.count()).toBe(1);
  expect(
    (await prisma.subscription.findFirstOrThrow()).periodEnd.toISOString(),
  ).toBe("2026-09-20T09:00:00.000Z");
});
it("uses timestamp due dates and clips month-end renewal periods", async () => {
  const c = await checkout();
  await once("VIPPS", "renew", (tx) =>
    reconcileVippsCharge(tx, c, "ACTIVE", {
      ...charge,
      type: "RECURRING",
      amount: 24900,
      due: "2027-01-31T00:00:00Z",
      summary: { captured: 24900, refunded: 0 },
    }),
  );
  expect(
    (await prisma.subscription.findFirstOrThrow()).periodEnd.toISOString(),
  ).toBe("2027-02-28T00:00:00.000Z");
});
