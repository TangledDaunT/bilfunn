import { env } from "../env";
import { mockProvider } from "./mock";
import { stripeProvider } from "./stripe";
import { vippsProvider } from "./vipps";
import { HttpError } from "../http";
export type {
  PaymentProvider,
  StartCheckoutInput,
  StartCheckoutResult,
} from "./types";
export const availableMethods = () => {
  const mode = env.payments.mode;
  const mock = mode === "mock" && process.env.NODE_ENV !== "production";
  return {
    vipps:
      mock ||
      (["vipps", "both"].includes(mode) &&
        Boolean(
          env.payments.vipps.clientId &&
          env.payments.vipps.clientSecret &&
          env.payments.vipps.subscriptionKey &&
          env.payments.vipps.msn &&
          env.payments.vipps.webhookSecret,
        )),
    card:
      mock ||
      (["stripe", "both"].includes(mode) &&
        Boolean(
          env.payments.stripe.secret &&
          env.payments.stripe.webhookSecret &&
          env.payments.stripe.priceIntro &&
          env.payments.stripe.priceMonthly,
        )),
    simulated: mock,
  };
};
export function getProvider(preferred: "card" | "vipps" = "card") {
  const methods = availableMethods();
  if (!methods[preferred])
    throw new HttpError(503, "payment_method_unavailable");
  if (methods.simulated) return mockProvider;
  return preferred === "vipps" ? vippsProvider : stripeProvider;
}
export function providerFor(name: string) {
  if (name === "STRIPE") return stripeProvider;
  if (name === "VIPPS") return vippsProvider;
  if (name === "MOCK" && process.env.NODE_ENV !== "production")
    return mockProvider;
  throw new Error("Unknown or disabled payment provider");
}
