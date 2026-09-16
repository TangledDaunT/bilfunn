/**
 * Seeds the config row and (optionally) demo customers across the subscription
 * lifecycle, so support and QA have something to look at. Run: npm run seed
 * Never run against production with DEMO=1.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DAY = 86400000;

async function main() {
  await prisma.config.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  console.log("✓ config row ready");

  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  for (const email of admins) {
    await prisma.user.upsert({ where: { email }, update: { role: "ADMIN" }, create: { email, role: "ADMIN" } });
    console.log(`✓ admin ${email}`);
  }

  if (process.env.DEMO !== "1") return;

  const demo: Array<[string, any, number]> = [
    ["kari.nordmann@example.no", "TRIALING", 0],
    ["ola.hansen@example.no", "ACTIVE", 1],
    ["thea.berg@example.no", "ACTIVE", 3],
    ["jonas.lie@example.no", "PAST_DUE", 1],
    ["ingrid.moen@example.no", "CANCELED", 1],
  ];

  for (const [email, status, renewals] of demo) {
    const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email } });
    await prisma.subscription.create({
      data: {
        userId: user.id,
        status,
        provider: "MOCK",
        renewals,
        paymentBrand: renewals ? "card" : "vipps",
        paymentLast4: "4242",
        periodStart: new Date(Date.now() - 2 * DAY),
        periodEnd: new Date(Date.now() + (status === "TRIALING" ? 1 : 22) * DAY),
        graceUntil: status === "PAST_DUE" ? new Date(Date.now() + 3 * DAY) : null,
        nextRetryAt: status === "PAST_DUE" ? new Date(Date.now() + DAY) : null,
        canceledAt: status === "CANCELED" ? new Date(Date.now() - DAY) : null,
        searchesThisPeriod: Math.floor(Math.random() * 6),
      },
    });
    await prisma.payment.create({
      data: {
        userId: user.id,
        kind: "INTRO",
        status: "SUCCEEDED",
        provider: "MOCK",
        amountOre: 300,
        vatOre: 60,
        receiptNumber: `BF-${Math.floor(100000 + Math.random() * 899999)}`,
      },
    });
  }
  console.log("✓ demo customers created");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
