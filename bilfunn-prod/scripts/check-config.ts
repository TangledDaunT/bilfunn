import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
async function main() {
  const { env, securityConfigurationErrors, integrationStatus } =
    await import("../src/lib/env");
  const errors = securityConfigurationErrors();
  for (const key of ["DATABASE_URL", "DIRECT_URL"])
    if (!process.env[key]) errors.push(key);
  const provider = env.svv.provider;
  if (!env.demoLogin.email || !env.demoLogin.passwordHash)
    errors.push("DEMO_LOGIN_EMAIL", "DEMO_LOGIN_PASSWORD_HASH");
  if (provider === "svv-technical" && !env.svv.key) errors.push("SVV_API_KEY");
  if (provider === "svv-owner")
    for (const key of [
      "MASKINPORTEN_CLIENT_ID",
      "MASKINPORTEN_PRIVATE_KEY",
      "MASKINPORTEN_KEY_ID",
      "MASKINPORTEN_SCOPE",
      "OWNER_API_BASE_URL",
    ])
      if (!process.env[key]) errors.push(key);
  for (const key of [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "QSTASH_TOKEN",
    "QSTASH_CURRENT_SIGNING_KEY",
    "QSTASH_NEXT_SIGNING_KEY",
  ])
    if (process.env.NODE_ENV === "production" && !process.env[key])
      errors.push(key);
  if (["stripe", "both"].includes(env.payments.mode))
    for (const key of [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_INTRO",
      "STRIPE_PRICE_MONTHLY",
    ])
      if (!process.env[key]) errors.push(key);
  if (["vipps", "both"].includes(env.payments.mode))
    for (const key of [
      "VIPPS_CLIENT_ID",
      "VIPPS_CLIENT_SECRET",
      "VIPPS_SUBSCRIPTION_KEY",
      "VIPPS_MSN",
      "VIPPS_WEBHOOK_SECRET",
    ])
      if (!process.env[key]) errors.push(key);
  console.log(
    JSON.stringify(
      { services: integrationStatus(), missingOrInvalid: [...new Set(errors)] },
      null,
      2,
    ),
  );
  process.exitCode = errors.length ? 1 : 0;
}
main().catch(() => {
  console.error("Configuration check failed; values are never printed.");
  process.exitCode = 1;
});
