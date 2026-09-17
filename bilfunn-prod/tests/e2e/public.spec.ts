import { test, expect } from "@playwright/test";
const origin =
  process.env.PRODUCTION_E2E === "1"
    ? `https://localhost:${process.env.TEST_HTTPS_PORT || 3101}`
    : `http://localhost:${process.env.TEST_HTTP_PORT || 3100}`;
test("cached homepage resolves account navigation without caching identity", async ({
  page,
}) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ authenticated: true, username: "demo" }),
    }),
  );
  const response = await page.goto("/");
  expect(await response!.text()).not.toContain(">demo</a>");
  await expect(page.locator(".design-login")).toHaveText("demo");
  await expect(page.locator(".design-login")).toHaveAttribute("href", "/konto");
  await expect(page.locator('a[href="/logg-inn"]')).toHaveCount(0);
});
test("public homepage is usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const response = await page.goto(`${origin}/`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Kjenn bilen.Før dubestemmer deg.",
  );
  await page.getByLabel("Registreringsnummer").first().fill("AB12345");
  await page
    .getByRole("button", { name: "Søk kjøretøy", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/logg-inn\?next=/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Logg inn",
  );
  await context.close();
});
test("disabled, invalid, and unpublished pages return honest statuses", async ({
  request,
}) => {
  const denied = await request.get("/AB12345", { maxRedirects: 0 });
  expect(denied.status()).toBe(303);
  expect(denied.headers().location).toContain("/logg-inn?next=");
  expect((await request.get("/api/vehicle/AB12345")).status()).toBe(401);
  expect((await request.get("/AB123456789")).status()).toBe(404);
  expect((await request.get("/hvem-eier-bilen")).status()).toBe(404);
  expect((await request.get("/blogg/nonexistent")).status()).toBe(404);
  const old = await request.get("/kjoretoy/ab12345", { maxRedirects: 0 });
  expect(old.status()).toBe(308);
  expect(old.headers().location).toContain("/AB12345");
});
test("cross-origin mutations and unauthenticated checkout are denied", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/checkout", {
        headers: { origin: "https://evil.test" },
        data: {
          email: "victim@example.test",
          method: "card",
          plate: "AB12345",
          accepted: true,
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/checkout", {
        headers: { origin },
        data: {
          email: "victim@example.test",
          method: "card",
          plate: "AB12345",
          accepted: true,
        },
      })
    ).status(),
  ).toBe(401);
});
test("sitemaps exclude disabled vehicle data", async ({ request }) => {
  const map = await request.get("/sitemap.xml");
  expect(map.status()).toBe(200);
  expect(await map.text()).toContain("sitemap-pages.xml");
  expect(await map.text()).not.toContain("vehicles-0");
});

test("public hash policy and private nonce policy work in a browser", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    (window as any).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as any).__csp.push(e.violatedDirective),
    );
  });
  const publicResponse = await page.goto("/");
  expect(publicResponse?.headers()["content-security-policy"]).toContain(
    "sha256-",
  );
  expect(await page.evaluate(() => (window as any).__csp)).toEqual([]);
  const first = await page.goto("/logg-inn");
  const csp = first?.headers()["content-security-policy"] || "";
  expect(csp).toContain("nonce-");
  expect(first?.headers()["cache-control"]).toContain("no-store");
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  expect(
    await page
      .locator("script[src]")
      .first()
      .evaluate((el) => (el as HTMLScriptElement).nonce),
  ).toBe(nonce);
  await page.getByLabel("E-postadresse").fill("browser@example.test");
  await page.getByRole("button", { name: "Send kode", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await page.evaluate(() => (window as any).__csp)).toEqual([]);
  const second = await request.get("/logg-inn");
  expect(second.headers()["content-security-policy"]).not.toBe(csp);
});

test("legal pages hydrate in a clean browser without translation extensions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "datakilder",
    "vilkar",
    "personvern",
    "cookies",
    "angrerett",
  ]) {
    await page.goto(`/${path}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
    await expect(
      page.getByText("Utkast til gjennomgang før lansering."),
    ).toBeVisible();
    await expect(page.locator("html")).not.toHaveClass(/translated/);
  }
  expect(errors).toEqual([]);
});

test("login recovers from a dropped connection and shows rate-limit wait", async ({
  page,
}) => {
  await page.goto("/logg-inn");
  await page.route("**/api/auth/request", (route) => route.abort("failed"));
  await page.getByLabel("E-postadresse").fill("recovery@example.test");
  await page.getByRole("button", { name: "Send kode", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Nettverksfeil",
  );
  await expect(
    page.getByRole("button", { name: "Send kode", exact: true }),
  ).toBeEnabled();
  await page.unroute("**/api/auth/request");
  await page.route("**/api/auth/request", (route) =>
    route.fulfill({
      status: 429,
      headers: { "Retry-After": "42" },
      body: "{}",
    }),
  );
  await page.getByRole("button", { name: "Send kode", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "42 sekunder",
  );
});

test("health and cron authentication work, robots protect account routes", async ({
  request,
}) => {
  expect((await request.get("/rapport/AB123456789")).status()).toBe(404);
  expect((await request.get("/api/health")).status()).toBe(200);
  expect((await request.get("/api/cron/billing")).status()).toBe(401);
  expect((await request.get("/api/session")).status()).toBe(401);
  const robots = await (await request.get("/robots.txt")).text();
  for (const path of ["/konto", "/admin", "/rapport/", "/kasse"])
    expect(robots).toContain(`Disallow: ${path}`);
  expect((await request.get("/this-page-does-not-exist")).status()).toBe(404);
});
