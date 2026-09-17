import { afterEach, describe, expect, it, vi } from "vitest";
import { endpoint, HttpError, readBody } from "../../src/lib/http";
import { clientRequest, retryMessage } from "../../src/lib/client-request";

afterEach(() => {
  vi.unstubAllGlobals();
});
describe("request recovery", () => {
  it("preserves the actual rate limit wait in an API response and user message", async () => {
    const response = await endpoint(async () => {
      throw new HttpError(429, "too_many_attempts", 42);
    })(new Request("http://localhost/test"));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(retryMessage(response)).toContain("42 sekunder");
  });
  it("attaches an abort deadline without changing the mutation body", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetcher);
    await clientRequest("/api/account/delete", { method: "POST", body: "{}" });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/account/delete",
      expect.objectContaining({
        method: "POST",
        body: "{}",
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it("does not expose internal errors to clients", async () => {
    const response = await endpoint(async () => {
      throw new Error("private-provider-data");
    })(new Request("http://localhost/test"));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-provider-data");
  });
  it("rejects streamed request bodies beyond the size limit", async () => {
    await expect(
      readBody(
        new Request("http://localhost/test", {
          method: "POST",
          body: "too long",
        }),
        2,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
});
