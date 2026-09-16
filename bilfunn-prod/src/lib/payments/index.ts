import { env } from "../env";
import { mockProvider } from "./mock";
import { stripeProvider } from "./stripe";
import { vippsProvider } from "./vipps";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, StartCheckoutInput, StartCheckoutResult } from "./types";

export function getProvider(preferred?: "card" | "vipps"): PaymentProvider {
  const mode = env.payments.mode;
  if (mode === "mock") return mockProvider;
  if (mode === "stripe") return env.payments.stripe.secret ? stripeProvider : mockProvider;
  if (mode === "vipps") return env.payments.vipps.clientId ? vippsProvider : mockProvider;
  // both
  if (preferred === "vipps" && env.payments.vipps.clientId) return vippsProvider;
  if (env.payments.stripe.secret) return stripeProvider;
  if (env.payments.vipps.clientId) return vippsProvider;
  return mockProvider;
}

export function providerFor(name: string): PaymentProvider {
  if (name === "STRIPE") return stripeProvider;
  if (name === "VIPPS") return vippsProvider;
  return mockProvider;
}

export const availableMethods = () => {
  const mode = env.payments.mode;
  return {
    vipps: mode === "mock" || ((mode === "vipps" || mode === "both") && Boolean(env.payments.vipps.clientId)),
    card: mode === "mock" || ((mode === "stripe" || mode === "both") && Boolean(env.payments.stripe.secret)),
    simulated: mode === "mock",
  };
};
