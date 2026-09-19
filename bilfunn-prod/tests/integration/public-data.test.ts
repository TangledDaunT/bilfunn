import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
const lookup = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/vehicle/index", () => ({ lookupVehicle: lookup }));
import { prisma } from "../../src/lib/db";
import { env } from "../../src/lib/env";
import {
  refreshVehicle,
  publicRecord,
} from "../../src/lib/vehicle/public-store";
import { publicFields } from "../../src/lib/vehicle/public-model";
import { vehicleSitemap } from "../../src/lib/sitemaps";
import { GET } from "../../src/app/[slug]/route";
const vehicle = {
  plate: "AB12345",
  make: "Example",
  model: "Car",
  firstRegistered: "2020-01-01",
  fuel: "Electric",
  color: "Blue",
  owner: { name: "SECRET PERSON" },
  vin: "SECRET VIN",
  source: "SVV" as const,
  fetchedAt: new Date().toISOString(),
  simulated: false,
};
beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("/sk_test"))
    throw new Error("Dedicated test DB required");
  Object.assign(env.svv, {
    persist: true,
    publish: true,
    validated: true,
    retentionHours: 48,
  });
});
beforeEach(async () => {
  await prisma.publicVehicle.deleteMany();
  await prisma.seoPolicy.deleteMany();
  await prisma.outbox.deleteMany();
  lookup.mockReset();
  lookup.mockResolvedValue({ ok: true, vehicle });
});
afterAll(() => prisma.$disconnect());
it("renders cached public data without leaking protected fields", async () => {
  const row = await refreshVehicle("AB12345", false);
  const response = await GET(new Request("https://local/AB12345"), {
    params: Promise.resolve({ slug: "AB12345" }),
  });
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toContain("s-maxage=300");
  expect(lookup).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(row!.data)).not.toMatch(/SECRET PERSON|SECRET VIN/);
  expect(html).not.toMatch(/SECRET PERSON|SECRET VIN|"owner"|"vin"/);
  const sitemap = await vehicleSitemap(
    Math.floor((row!.catalogId - 1) / 10000),
  );
  expect(await sitemap.text()).toContain("/AB12345");
});
it("does not change lastmod when provider JSON key ordering changes", async () => {
  const first = await refreshVehicle("AB12345", false);
  lookup.mockResolvedValue({
    ok: true,
    vehicle: {
      ...vehicle,
      fetchedAt: new Date(Date.now() + 1000).toISOString(),
    },
  });
  const next = await refreshVehicle("AB12345", false);
  expect(next!.changedAt.toISOString()).toBe(first!.changedAt.toISOString());
  expect(next!.fetchedAt.getTime()).toBeGreaterThan(first!.fetchedAt.getTime());
});
it("renders thin records as noindex and excludes them from sitemaps", async () => {
  lookup.mockResolvedValue({ ok: true, vehicle: { ...vehicle, model: null } });
  const row = await refreshVehicle("AB12345", false);
  const response = await GET(new Request("https://local/AB12345"), {
    params: Promise.resolve({ slug: "AB12345" }),
  });
  expect(response.status).toBe(200);
  expect(await response.text()).toContain('name="robots" content="noindex, follow"');
  expect(
    await (
      await vehicleSitemap(Math.floor((row!.catalogId - 1) / 10000))
    ).text(),
  ).not.toContain("/AB12345");
});
it("returns 503 for expired data during provider failure, never a false 404", async () => {
  await refreshVehicle("AB12345", false);
  await prisma.publicVehicle.update({
    where: { plate: "AB12345" },
    data: { expiresAt: new Date(0) },
  });
  lookup.mockResolvedValue({ ok: false, code: "PROVIDER_ERROR" });
  await expect(publicRecord("AB12345")).rejects.toMatchObject({ status: 503 });
});
it("suppression wins a race with an in-flight refresh", async () => {
  await refreshVehicle("AB12345", false);
  lookup.mockImplementation(async () => {
    await prisma.publicVehicle.update({
      where: { plate: "AB12345" },
      data: { suppressed: true, data: {}, eligible: false },
    });
    return { ok: true, vehicle };
  });
  const row = await refreshVehicle("AB12345", false);
  expect(row!.data).toEqual({});
  await expect(publicRecord("AB12345")).rejects.toMatchObject({ status: 404 });
  await prisma.publicVehicle.update({
    where: { plate: "AB12345" },
    data: { gone: true },
  });
  await expect(publicRecord("AB12345")).rejects.toMatchObject({ status: 410 });
});
it("rejects simulated data and invalid calendar dates", async () => {
  lookup.mockResolvedValue({
    ok: true,
    vehicle: { ...vehicle, simulated: true },
  });
  await expect(refreshVehicle("AB12345", false)).rejects.toMatchObject({
    status: 503,
  });
  expect(
    publicFields({ ...vehicle, firstRegistered: "2025-02-30" }).firstRegistered,
  ).toBeNull();
});

it("immediately enforces a shorter configured retention against existing records", async () => {
  await refreshVehicle("AB12345", false);
  await prisma.publicVehicle.update({
    where: { plate: "AB12345" },
    data: { fetchedAt: new Date(Date.now() - 2 * 3600000) },
  });
  const before = env.svv.retentionHours;
  env.svv.retentionHours = 1;
  lookup.mockResolvedValue({ ok: false, code: "PROVIDER_ERROR" });
  try {
    await expect(publicRecord("AB12345")).rejects.toMatchObject({
      status: 503,
    });
  } finally {
    env.svv.retentionHours = before;
  }
});
