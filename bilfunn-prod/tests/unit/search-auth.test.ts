import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  lookup: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/vehicle", () => ({
  lookupVehicle: mocks.lookup,
  freePreview: (v: unknown) => v,
}));
vi.mock("@/lib/rateLimit", () => ({ enforceRateLimit: mocks.limit }));
import { GET as search } from "../../src/app/sok/route";
import { GET as vehicle } from "../../src/app/api/vehicle/[regnr]/route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue(null);
});
it("redirects signed-out searches while preserving the requested report", async () => {
  const response = await search(
    new Request("https://example.test/sok?nr=RL56841"),
  );
  expect(response.status).toBe(303);
  const target = new URL(response.headers.get("location")!);
  expect(target.pathname).toBe("/logg-inn");
  expect(target.searchParams.get("next")).toBe("/rapport/RL56841");
});
it("denies anonymous API requests before contacting the vehicle provider", async () => {
  const response = await vehicle(
    new Request("https://example.test/api/vehicle/RL56841"),
    { params: Promise.resolve({ regnr: "RL56841" }) },
  );
  expect(response.status).toBe(401);
  expect(mocks.lookup).not.toHaveBeenCalled();
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("routes authenticated searches to their report", async () => {
  mocks.user.mockResolvedValue({ id: "user" });
  const response = await search(
    new Request("https://example.test/sok?nr=RL56841"),
  );
  expect(new URL(response.headers.get("location")!).pathname).toBe(
    "/rapport/RL56841",
  );
});
