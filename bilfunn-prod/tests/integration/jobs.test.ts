import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
const cancel = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/payments", () => ({ providerFor: () => ({ cancel }) }));
import { prisma } from "../../src/lib/db";
import { enqueue, processJobs } from "../../src/lib/jobs";
import { cancelSubscription } from "../../src/lib/billing";
beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("/sk_test"))
    throw new Error("Dedicated test DB required");
});
beforeEach(async () => {
  cancel.mockReset();
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
it("persists cancellation failure and retries the same agreement", async () => {
  const user = await prisma.user.create({
    data: { email: "cancel@example.test" },
  });
  const sub = await prisma.subscription.create({
    data: {
      userId: user.id,
      provider: "VIPPS",
      providerAgreementId: "agr_1",
      status: "ACTIVE",
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 86400000),
    },
  });
  await cancelSubscription(sub, user);
  cancel.mockRejectedValueOnce(new Error("provider unavailable"));
  await processJobs(1);
  const job = await prisma.outbox.findFirstOrThrow({
    where: { kind: "cancel" },
  });
  expect(job.status).toBe("PENDING");
  expect(job.attempts).toBe(1);
  expect(
    (await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } }))
      .cancelPending,
  ).toBe(true);
  await prisma.outbox.update({
    where: { id: job.id },
    data: { availableAt: new Date(0) },
  });
  cancel.mockResolvedValue(undefined);
  await processJobs(1);
  expect(
    (await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } }))
      .cancelPending,
  ).toBe(false);
  expect(cancel).toHaveBeenCalledTimes(2);
  expect(cancel.mock.calls[0]).toEqual(cancel.mock.calls[1]);
});
it("deduplicates concurrent job submissions", async () => {
  await Promise.all(
    Array.from({ length: 12 }, () =>
      enqueue("billing", {}, "same-billing-period"),
    ),
  );
  expect(await prisma.outbox.count()).toBe(1);
});
