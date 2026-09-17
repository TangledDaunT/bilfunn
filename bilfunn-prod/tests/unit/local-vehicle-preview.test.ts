import { afterEach, expect, it, vi } from "vitest";
import { localPreviewEnabled } from "../../src/lib/vehicle/local-preview";
import { lookupSvv } from "../../src/lib/vehicle/svv";
import { env } from "../../src/lib/env";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("requires explicit development opt-in and a local host", () => {
  const request = (host: string) =>
    new Request("http://localhost:3100/AB12345", { headers: { host } });
  vi.stubEnv("LOCAL_VEHICLE_PREVIEW", "true");
  vi.stubEnv("NODE_ENV", "production");
  expect(localPreviewEnabled(request("localhost:3100"))).toBe(false);
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", "");
  expect(localPreviewEnabled(request("localhost:3100"))).toBe(true);
  expect(localPreviewEnabled(request("evil.test"))).toBe(false);
  vi.stubEnv("VERCEL", "1");
  expect(localPreviewEnabled(request("localhost:3100"))).toBe(false);
});
it("treats an empty SVV 204 response as missing, not a JSON parsing failure", async () => {
  const previous = env.svv.key;
  env.svv.key = "test-only";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );
  try {
    expect(await lookupSvv("AB12345")).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
      status: 404,
    });
  } finally {
    env.svv.key = previous;
  }
});
