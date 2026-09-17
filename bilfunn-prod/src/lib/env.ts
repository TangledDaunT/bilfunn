const s = (key: string, fallback = "") => process.env[key]?.trim() || fallback;
const b = (key: string) => s(key) === "true";
const n = (key: string, fallback: number) => {
  const raw = s(key);
  return raw && Number.isFinite(Number(raw)) ? Number(raw) : fallback;
};
export const env = {
  baseUrl: s("NEXT_PUBLIC_BASE_URL", "http://localhost:3000").replace(
    /\/$/,
    "",
  ),
  sessionSecret: s("SESSION_SECRET"),
  google: {
    clientId: s("GOOGLE_CLIENT_ID"),
    clientSecret: s("GOOGLE_CLIENT_SECRET"),
  },
  encryptionKey: s("DATA_ENCRYPTION_KEY"),
  cronSecret: s("CRON_SECRET"),
  adminEmails: s("ADMIN_EMAILS")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  demoLogin: {
    email: s("DEMO_LOGIN_EMAIL").toLowerCase(),
    passwordHash: s("DEMO_LOGIN_PASSWORD_HASH"),
  },
  redis: {
    url: s("UPSTASH_REDIS_REST_URL", s("KV_REST_API_URL")),
    token: s("UPSTASH_REDIS_REST_TOKEN", s("KV_REST_API_TOKEN")),
  },
  qstash: {
    token: s("QSTASH_TOKEN"),
    currentKey: s("QSTASH_CURRENT_SIGNING_KEY"),
    nextKey: s("QSTASH_NEXT_SIGNING_KEY"),
  },
  svv: {
    provider: s("VEHICLE_PROVIDER", "disabled"),
    validated: b("VEHICLE_PROVIDER_VALIDATED"),
    key: s("SVV_API_KEY"),
    baseUrl: s(
      "SVV_BASE_URL",
      "https://www.vegvesen.no/ws/no/vegvesen/kjoretoy/felles/datautlevering/enkeltoppslag/kjoretoydata",
    ),
    dailyQuota: n("VEHICLE_DAILY_QUOTA", 0),
    persist: b("VEHICLE_STORAGE_PERMITTED"),
    publish: b("VEHICLE_PUBLICATION_PERMITTED"),
    retentionHours: n("VEHICLE_RETENTION_HOURS", 0),
  },
  owner: {
    enabled: b("OWNER_DATA_ENABLED"),
    key: s("OWNER_API_KEY"),
    baseUrl: s("OWNER_API_BASE_URL"),
    clientId: s("MASKINPORTEN_CLIENT_ID"),
    privateKey: s("MASKINPORTEN_PRIVATE_KEY").replace(/\\n/g, "\n"),
    keyId: s("MASKINPORTEN_KEY_ID"),
    scope: s("MASKINPORTEN_SCOPE"),
    issuer: s("MASKINPORTEN_ISSUER", "https://maskinporten.no/"),
  },
  payments: {
    mode: s("PAYMENTS_MODE", "disabled"),
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
    from: s("EMAIL_FROM"),
    support: s("SUPPORT_EMAIL"),
  },
  analytics: {
    ga4: /^G-[A-Z0-9]+$/.test(s("NEXT_PUBLIC_GA4_ID"))
      ? s("NEXT_PUBLIC_GA4_ID")
      : "",
    gtm: "",
  },
  defaults: {
    introPriceOre: n("INTRO_PRICE_ORE", 300),
    renewalPriceOre: n("RENEWAL_PRICE_ORE", 24900),
    introDays: n("INTRO_DAYS", 3),
  },
};
export function securityConfigurationErrors() {
  const errors: string[] = [];
  try {
    const database = new URL(process.env.DATABASE_URL || "");
    if (!["postgres:", "postgresql:"].includes(database.protocol))
      errors.push("DATABASE_URL");
  } catch {
    errors.push("DATABASE_URL");
  }
  if (
    env.sessionSecret.length < 32 ||
    /dev-only|change-me|example/i.test(env.sessionSecret)
  )
    errors.push("SESSION_SECRET");
  if (!/^[a-f0-9]{64}$/i.test(env.encryptionKey))
    errors.push("DATA_ENCRYPTION_KEY");
  if (env.cronSecret.length < 32) errors.push("CRON_SECRET");
  if (
    Boolean(env.demoLogin.email) !== Boolean(env.demoLogin.passwordHash) ||
    (env.demoLogin.email &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.demoLogin.email) ||
        !/^scrypt\$[A-Za-z0-9_-]{22,}\$[a-f0-9]{128}$/i.test(
          env.demoLogin.passwordHash,
        )))
  )
    errors.push("DEMO_LOGIN_EMAIL", "DEMO_LOGIN_PASSWORD_HASH");
  if (
    !env.baseUrl.startsWith("https://") &&
    process.env.NODE_ENV === "production"
  )
    errors.push("NEXT_PUBLIC_BASE_URL");
  if (
    ![
      "disabled",
      "svv-technical",
      "svv-owner",
      "staging-fixture",
      "simulated",
    ].includes(env.svv.provider)
  )
    errors.push("VEHICLE_PROVIDER");
  if (
    !["disabled", "stripe", "vipps", "both", "mock"].includes(env.payments.mode)
  )
    errors.push("PAYMENTS_MODE");
  if (
    env.svv.provider === "staging-fixture" &&
    process.env.STAGING_MODE !== "true"
  )
    errors.push("STAGING_MODE");
  if (process.env.NODE_ENV === "production") {
    if (env.payments.mode === "mock") errors.push("PAYMENTS_MODE");
    if (env.svv.provider === "simulated") errors.push("VEHICLE_PROVIDER");
    if (!env.redis.url || !env.redis.token)
      errors.push("UPSTASH_REDIS_REST_URL_OR_KV_REST_API_URL");
  }
  if (
    (env.svv.persist || env.svv.publish) &&
    (!env.svv.validated ||
      env.svv.retentionHours <= 0 ||
      env.svv.dailyQuota <= 0)
  )
    errors.push(
      "VEHICLE_RETENTION_HOURS",
      "VEHICLE_DAILY_QUOTA",
      "VEHICLE_PROVIDER_VALIDATED",
    );
  if (
    !Number.isSafeInteger(env.svv.retentionHours) ||
    env.svv.retentionHours < 0
  )
    errors.push("VEHICLE_RETENTION_HOURS");
  if (!Number.isSafeInteger(env.svv.dailyQuota) || env.svv.dailyQuota < 0)
    errors.push("VEHICLE_DAILY_QUOTA");
  return [...new Set(errors)];
}
export const integrationStatus = () => ({
  googleLogin:
    env.google.clientId && env.google.clientSecret ? "configured" : "disabled",
  vehicleApi:
    env.svv.validated && env.svv.provider !== "disabled"
      ? "configured"
      : "disabled",
  ownerApi: "disabled: mapping not verified",
  payments: env.payments.mode,
  email: emailConfigured() ? "configured" : "disabled",
  database: process.env.DATABASE_URL ? "configured" : "missing",
});

export const queueConfigured = () =>
  Boolean(env.qstash.token && env.qstash.currentKey && env.qstash.nextKey);
export const emailConfigured = () =>
  Boolean(
    env.email.resendKey &&
    env.email.from &&
    (process.env.NODE_ENV !== "production" || queueConfigured()),
  );

export const demoLoginConfigured = () =>
  Boolean(env.demoLogin.email && env.demoLogin.passwordHash);
