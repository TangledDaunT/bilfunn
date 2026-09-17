import { it, expect, vi } from "vitest";
const fake = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = "test-transport-only";
  return {
    prices: { retrieve: vi.fn() },
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
  };
});
vi.mock("stripe", () => ({
  default: class {
    constructor() {
      return fake;
    }
  },
}));
import { stripeProvider } from "../../src/lib/payments/stripe";
import { env } from "../../src/lib/env";
it("charges the intro price alongside a trial subscription and constructs a valid return URL", async () => {
  env.payments.stripe.priceIntro = "intro";
  env.payments.stripe.priceMonthly = "monthly";
  fake.prices.retrieve.mockImplementation(async (id: string) =>
    id === "intro"
      ? {
          id,
          active: true,
          type: "one_time",
          currency: "nok",
          unit_amount: 300,
        }
      : {
          id,
          active: true,
          currency: "nok",
          unit_amount: 24900,
          recurring: { interval: "month", interval_count: 1 },
        },
  );
  fake.customers.create.mockResolvedValue({ id: "customer" });
  fake.checkout.sessions.create.mockResolvedValue({
    id: "session",
    url: "https://checkout.stripe.com/test",
  });
  await stripeProvider.startCheckout({
    checkoutId: "checkout1",
    userId: "user1",
    email: "user@example.test",
    plate: "AB12345",
    introPriceOre: 300,
    renewalPriceOre: 24900,
    introDays: 3,
    returnUrl: "https://example.test/kvittering?nr=AB12345",
  });
  const [body, options] = fake.checkout.sessions.create.mock.calls[0];
  expect(body.line_items).toEqual([
    { price: "intro", quantity: 1 },
    { price: "monthly", quantity: 1 },
  ]);
  expect(body.subscription_data.trial_period_days).toBe(3);
  expect(new URL(body.success_url).searchParams.get("checkout")).toBe(
    "checkout1",
  );
  expect(new URL(body.success_url).searchParams.get("nr")).toBe("AB12345");
  expect(options.idempotencyKey).toBe("checkout:checkout1");
});
