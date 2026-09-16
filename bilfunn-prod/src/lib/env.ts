// Central env access. Nothing throws at import time: a missing optional key
// degrades a feature, it does not take the site down.
const s = (k: string, d = "") => process.env[k]?.trim() || d;
const b = (k: string, d = false) => {
  const v = process.env[k]?.trim().toLowerCase();
  if (v === undefined || v === "") return d;
  return v === "true" || v === "1" || v === "yes";
};
const n = (k: string, d: number) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) ? v : d;
};

export const env = {
  baseUrl: s("NEXT_PUBLIC_BASE_URL", "http://localhost:3000").replace(/\/$/, ""),
  sessionSecret: s("SESSION_SECRET", "dev-only-insecure-secret-change-me-32chars"),
  cronSecret: s("CRON_SECRET"),
  adminEmails: s("ADMIN_EMAILS")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),

  svv: {
    key: s("SVV_API_KEY"),
    baseUrl: s(
      "SVV_BASE_URL",
      "https://www.vegvesen.no/ws/no/vegvesen/kjoretoy/felles/datautlevering/enkeltoppslag/kjoretoydata"
    ),
  },
  owner: {
    key: s("OWNER_API_KEY"),
    baseUrl: s("OWNER_API_BASE_URL"),
    enabled: b("OWNER_DATA_ENABLED", false),
  },

  payments: {
    mode: s("PAYMENTS_MODE", "mock") as "mock" | "stripe" | "vipps" | "both",
    stripe: {
      secret: s("STRIPE_SECRET_KEY"),
      webhookSecret: s("STRIPE_WEBHOOK_SECRET"),
      priceIntro: s("STRIPE_PRICE_INTRO"),
      priceMonthly: s("STRIPE_PRICE_MONTHLY"),
    },
    vipps: {
      clientId: s("VIPPS_CLIENT_ID"),
      clientSecret: s("VIPPS_CLIENT_SECRET"),
      subscriptionKey: s("VIPPS_SUBSCRIPTION_KEY"),
      msn: s("VIPPS_MSN"),
      baseUrl: s("VIPPS_BASE_URL", "https://apitest.vipps.no"),
      webhookSecret: s("VIPPS_WEBHOOK_SECRET"),
    },
  },

  email: {
    resendKey: s("RESEND_API_KEY"),
    from: s("EMAIL_FROM", "Bilfunn <ikke-svar@bilfunn.no>"),
    support: s("SUPPORT_EMAIL", "support@bilfunn.no"),
  },

  analytics: { ga4: s("NEXT_PUBLIC_GA4_ID"), gtm: s("NEXT_PUBLIC_GTM_ID") },

  defaults: {
    introPriceOre: n("INTRO_PRICE_ORE", 300),
    renewalPriceOre: n("RENEWAL_PRICE_ORE", 24900),
    introDays: n("INTRO_DAYS", 3),
  },
};

export const integrationStatus = () => ({
  vehicleApi: env.svv.key ? "live" : "simulated",
  ownerApi: env.owner.enabled && env.owner.key ? "live" : "disabled",
  payments: env.payments.mode === "mock" ? "simulated" : env.payments.mode,
  email: env.email.resendKey ? "live" : "logged",
  database: process.env.DATABASE_URL ? "configured" : "missing",
});
