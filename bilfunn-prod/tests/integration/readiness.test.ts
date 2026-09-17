import { afterAll, expect, it } from "vitest";
import { prisma } from "../../src/lib/db";
import { POST as contact } from "../../src/app/api/contact/route";
import { hashIp } from "../../src/lib/crypto";
import { GET as health } from "../../src/app/api/health/route";

afterAll(async () => {
  await prisma.ticket.deleteMany({
    where: { email: "readiness@example.test" },
  });
  await prisma.$disconnect();
});

it("blocks repeated contact requests and returns the real window wait", async () => {
  await prisma.rateLimit.deleteMany({
    where: { key: `contact:${hashIp("local")}` },
  });
  const responses = [];
  for (let i = 0; i < 6; i++)
    responses.push(
      await contact(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Readiness test",
            email: "readiness@example.test",
            category: "Annet",
            message: "Isolated rate limit regression test.",
          }),
        }),
      ),
    );
  expect(responses.slice(0, 5).every((r) => r.ok)).toBe(true);
  expect(responses[5].status).toBe(429);
  expect(Number(responses[5].headers.get("Retry-After"))).toBeGreaterThan(3500);
  expect(Number(responses[5].headers.get("Retry-After"))).toBeLessThanOrEqual(
    3600,
  );
  expect(
    await prisma.ticket.count({ where: { email: "readiness@example.test" } }),
  ).toBe(5);
});

it("health verifies the database", async () => {
  expect((await health()).status).toBe(200);
});

it("terminates a stalled database query instead of waiting forever", async () => {
  const start = Date.now();
  await expect(prisma.$queryRaw`SELECT pg_sleep(15)`).rejects.toThrow();
  expect(Date.now() - start).toBeLessThan(13000);
  expect((await health()).status).toBe(200);
}, 15000);
