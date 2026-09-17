import { describe, it, expect } from "vitest";
import { normalizePlate, isValidPlate } from "../../src/lib/plate";
import { verifyVipps } from "../../src/lib/payments/vipps-signature";
import { publicFields, eligible } from "../../src/lib/vehicle/public-model";
import { publicHtml } from "../../src/lib/public-html";
import { createHash, createHmac } from "node:crypto";
import { jsonBody, readBody } from "../../src/lib/http";
import { z } from "zod";
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
describe("public boundaries", () => {
  it("never repairs malformed registration into another vehicle", () => {
    for (const s of [
      "AB123456",
      "AB12<script>",
      "AB_12345",
      "AB.12345",
      "AB-12345",
      "ß1234",
    ])
      expect(isValidPlate(normalizePlate(s))).toBe(false);
    expect(normalizePlate("ab 12345")).toBe("AB12345");
  });
  it("whitelists fields and rejects thin data", () => {
    const data = publicFields(vehicle);
    expect(JSON.stringify(data)).not.toMatch(/SECRET|owner|vin/);
    expect(eligible(data)).toBe(true);
    expect(eligible({ ...data, make: null })).toBe(false);
    expect(eligible({ ...data, color: null })).toBe(false);
  });
  it("escapes hostile metadata and binds CSP to exact JSON-LD", async () => {
    const r = publicHtml({
      title: "</title><script>alert(1)</script>",
      description: '" onmouseover="alert(1)',
      path: "/AB12345",
      body: "<h1>Safe</h1>",
      schema: [{ name: "</script><img src=x onerror=alert(1)>" }],
    });
    const html = await r.text();
    expect(html).not.toContain("</title><script>alert");
    const script = html.match(
      /<script type="application\/ld\+json">(.*?)<\/script>/s,
    )![1];
    expect(script).not.toContain("</script>");
    const hash = createHash("sha256").update(script).digest("base64");
    expect(r.headers.get("content-security-policy")).toContain(
      `'sha256-${hash}'`,
    );
    expect(r.headers.get("set-cookie")).toBeNull();
  });
  it("bounds request bodies even without content-length", async () => {
    await expect(
      readBody(
        new Request("https://local", { method: "POST", body: "x".repeat(100) }),
        50,
      ),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      jsonBody(
        new Request("https://local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
        z.object({}),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
describe("Vipps signature", () => {
  const secret = "test-signing-secret",
    url = "https://skiltnummeret.no/api/webhooks/vipps",
    raw = '{"agreementId":"agr_1"}';
  function signed(now: number) {
    const date = new Date(now).toUTCString(),
      hash = createHash("sha256").update(raw).digest("base64");
    const sig = createHmac("sha256", secret)
      .update(`POST\n/api/webhooks/vipps\n${date};skiltnummeret.no;${hash}`)
      .digest("base64");
    return new Headers({
      "x-ms-date": date,
      "x-ms-content-sha256": hash,
      authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${sig}`,
    });
  }
  it("requires configured secret, signed URI, timestamp and body", () => {
    const now = Date.now(),
      headers = signed(now);
    expect(verifyVipps(raw, headers, url, secret, now)).toBe(true);
    expect(verifyVipps(raw, headers, url, "", now)).toBe(false);
    expect(verifyVipps(raw + " ", headers, url, secret, now)).toBe(false);
    expect(verifyVipps(raw, headers, url + "?evil=1", secret, now)).toBe(false);
    expect(verifyVipps(raw, headers, url, secret, now + 600000)).toBe(false);
  });
});
