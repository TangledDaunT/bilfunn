# Deployment and release gates

## Infrastructure and secrets

Provision Vercel Enterprise, Neon PostgreSQL in the application region with a pooled runtime URL and direct migration URL, Upstash Redis, and QStash. No services are purchased or deployed by this change. Agree capacity, spending limits, concurrency, connection budgets, and quotas with each provider before load testing. See [Vercel concurrency limits](https://vercel.com/docs/functions/concurrency-scaling).

Set the Vercel project root to `bilfunn-prod`, Node.js 22+, install command `npm ci`, build command `npm run build`, and region Frankfurt (`fra1`). Upload the variables documented in `.env.example` through the secret manager. Never commit environment files. Set `NEXT_PUBLIC_BASE_URL=https://skiltnummeret.no`; configure both domain ownership and HTTPS. Build each environment with its own origin. Give staging a separate database, Redis, queue, payment test accounts, and `STAGING_MODE=true`. Protect staging from indexing and unauthorized access.

Generate independent random `SESSION_SECRET` and `CRON_SECRET` values of at least 32 characters and a 32-byte hexadecimal `DATA_ENCRYPTION_KEY`. Store the encryption key in recoverable secret storage: losing it makes queued jobs and administrator MFA unreadable. Rotation requires re-encryption/draining jobs and reprovisioning MFA, not simply replacing the key.

For Neon, start with `connection_limit=5&pool_timeout=5&connect_timeout=5` on the pooled `DATABASE_URL`; set a provider-approved global pool ceiling. Use `DIRECT_URL` only for migrations. Set statement timeouts and monitor pool wait time. These are starting limits, not evidence of capacity. Run `NODE_ENV=production npm run config:check` privately; the checker prints names, never secret values.

## Database and administrators

For a new database run `npm run db:migrate` followed by `npm run seed`. Migrations include database receipt numbering and a unique pending checkout per account. Seed initializes configuration without demo customers or admin promotion. Existing installations created with `db push` need a reviewed baseline migration on a database clone; do not apply the initial migration blindly to populated tables.

List permitted administrator addresses in `ADMIN_EMAILS`, then run `npm run admin:provision -- admin@example.com /private/secure/mfa.txt`. The output file is created exclusively with mode 0600. Import its OTP URI into an authenticator and securely remove that file. Email verification and a recent TOTP challenge remain required. MFA reprovisioning revokes existing sessions.

## Providers and permitted data

Paste your key into `.env` locally; do not send it to anyone. Select the actual `VEHICLE_PROVIDER` explicitly. Technical mode uses `SVV_API_KEY`; agreement mode requires its endpoint and Maskinporten client, key ID, private key, scope, and issuer. Inspect the actual schema and privately verify known-found, known-missing, forbidden, quota, and outage responses. Unknown owner-service contracts fail closed; owner display is not implemented without a verified mapping. Do not enable it by guessing field names.

Set `VEHICLE_PROVIDER_VALIDATED=true` only after those checks. Set quota, permitted retention hours, `VEHICLE_STORAGE_PERMITTED`, and `VEHICLE_PUBLICATION_PERMITTED` from your agreement. The retention setting must not exceed the authorized retention; the application cannot infer that contractual limit. Changing publication permissions or retention requires CDN purge and removal/expiry of existing data before reopening traffic. Never enumerate registration numbers. `npm run vehicles:import -- authorized-plates.txt` requires `IMPORT_TOKEN` and accepts only a dataset you are authorized to use.

Stripe requires an active one-time NOK 3 price and a monthly NOK 249 price. Set both price IDs; the adapter checks amounts against accepted checkout terms. Configure the webhook API version to the SDK's `2025-02-24.acacia` and subscribe to `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.expired`, and `charge.refunded`. Checkout completion alone grants no access.

Vipps uses the recurring API and its documented HMAC webhook signature, including signed date, host, URI, and body digest. Subscribe to agreement and charge capture/failure/refund events at `/api/webhooks/vipps`. Set the webhook secret and merchant number; verify signatures in the provider test environment. Captures and refunds use the authoritative charge `summary` and `history`, not agreement activation. See [Vipps API schema](https://developer.vippsmobilepay.com/api/recurring/) and [SVV service details](https://dataut.vegvesen.no/dataservice/kjoretoyopplysninger-med-eierinformasjon).

Verify Resend sending-domain DNS and set `EMAIL_FROM`. Missing credentials do not simulate delivery. Set all QStash keys, including both signing keys. `vercel.json` schedules the authenticated dispatcher every minute; validate actual delivery and clock synchronization after deployment. QStash flow control starts at 10 parallel workers and 20 dispatches/second. Outbox leases, retries, dead letters, and a 10,000-job admission limit are enforced. Monitor and adjust provisioned capacity before opening traffic.

## Tests and staged release

Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, isolated PostgreSQL integration tests, `npm run security:secrets`, `npm audit --audit-level=high`, and `npm run build`. Run `PRODUCTION_E2E=1 node scripts/test-local.mjs e2e` after a build to exercise cached hash CSP and private nonce CSP over local HTTPS. CI supplies isolated test credentials; never substitute live credentials.

Privately verify each enabled provider using its own test environment: initial charge, renewal, retry, duplicate and out-of-order delivery, refund, abandoned checkout, cancellation failure/retry, deleted accounts, and email rejection. Compare payment ledgers against provider dashboards. Verify cancellation of scheduled Vipps charges under your merchant configuration. Refund ledger updates do not implicitly decide a separate commercial entitlement policy; review that policy before launch.

Take a Neon backup/branch, migrate a staging clone, restore it into another isolated database, verify row counts, payment uniqueness, receipt sequence, login revocation and sample account behavior. Record restore time and data loss window. Keep the old deployment and compatible schema; rehearse reverting traffic before releasing. Do not roll back to the vulnerable pre-hardening authentication implementation. For incompatible schema changes, use a reviewed restore or forward fix while checkout is disabled. Never run destructive rollback commands against production as a test.

Release requires signed-off provider checks, security regressions, restoration/rollback evidence, monitoring, content approval, and load-test results. Failed gates block launch. Local tests alone do not establish production reliability.

## Load-test workload and acceptance

Use only provisioned staging and simulated external providers. Never point k6 at live SVV, payment, or email services. Production mode rejects the application's demo provider; use `VEHICLE_PROVIDER=staging-fixture`, an HTTPS `STAGING_VEHICLE_FIXTURE_URL`, matching `STAGING_FIXTURE_HOST`, and a staging-only fixture dataset. Verify isolation before starting. `tests/load/mixed.js` requires `CONFIRM_STAGING=yes`, `USE_REAL_PROVIDERS=false`, an exact `STAGING_HOST`, HTTPS `TARGET_ORIGIN`, and `FIXTURE_FILE` containing an array of `{ "plate": "AB12345", "cookie": "__Host-sk_session=..." }`. Use dedicated staging accounts and keep fixture files private and ignored.

Run baseline stages at 100, 1,000, 5,000, then 10,000 actions/second, for at least 15 minutes each, followed by a one-hour soak. The chosen model is 500,000 active sessions acting once every 50 seconds: 95% public page browsing, 4% cached public lookups, 1% authenticated session reads. It is not 500,000 simultaneous in-flight requests and does not validate a heavier authenticated-write mix. Test transactional writes separately with sandbox providers. Distribute k6 execution segments across independent generators whose combined rate equals the target; verify generator saturation and dropped iterations. Measure asset traffic separately.

Require p95 cached-page time below 500 ms, p95 application API time below 1 second excluding upstream providers, and unexpected server errors below 0.1%. Report 429 and 503 responses separately; they cannot count as successful capacity. Require zero duplicate charges, cross-account disclosures, and growing queues/memory after traffic returns to baseline. Compare queue depth, DB waits, Redis latency, CDN hit rate, and provider calls before/after each stage.

Use `tests/load/failure.js` for concentrated cold-cache bursts. Repeat after purging staging caches, exhausting the shared test quota, and independently interrupting Redis, PostgreSQL, QStash, and simulated providers. Check bounded response times, explicit temporary failures, no stale/suppressed data, recovery, and dead-letter alerts. These tests are intentionally not executed without provisioned staging.

## Monitoring and incident response

Poll `/api/ops` with the protected cron bearer credential for queue depth, dead jobs, cancellation backlog, delayed checkouts, oldest pending age, provider quota use and circuit state. Alert on `operations_alert`. Probe `/api/health` for liveness and `/api/ready` for configured database/Redis readiness. Configure Vercel and Upstash alerts for p95 latency, errors, cache misses, memory, connection waits, rate limits, provider quota use, and QStash delivery failures. Configure log-drain alerts for `job_failed`, `queue_wakeup_failed`, `endpoint_unavailable`, and billing reconciliation failures. Never include request bodies, auth query strings, cookies, owner payloads, or raw provider responses in telemetry. Keep access-log query capture disabled for login links.

Page an operator for any dead billing/cancellation job, payment mismatch, or pending checkout older than two hours. Review the sanitized `Outbox` metadata, compare provider state, correct the cause, and requeue only the affected idempotent job. Do not generate a new checkout/charge ID to recover a timeout. Failed pre-reference checkouts need provider idempotency reconciliation before being expired or replaced. For data suppression, require successful CDN invalidation; if purge fails, stop public traffic until it succeeds. Rehearse these procedures on staging.

### Preparing synthetic staging fixtures

On the isolated staging database, set `STAGING_MODE=true`, `CONFIRM_STAGING=yes`, and `STAGING_DATABASE_HOST` to its exact hostname. Run `npx tsx scripts/staging-fixtures.ts /private/fixtures.json 1000` (increase toward 500,000 only after provisioning). It creates mode-0600 load and `.provider.json` files without contacting a provider. Host `scripts/staging-fixture-server.mjs` behind staging HTTPS with `STAGING_MODE=true` and `FIXTURE_FILE` pointing to the provider file. `FIXTURE_FAILURE=true` simulates 503 responses; `FIXTURE_DELAY_MS` simulates latency. The app's `staging-fixture` adapter refuses operation outside staging. Set explicit synthetic retention/quota and publication gates in the isolated staging environment; pages remain noindex. Never transfer synthetic rows to production. Expire test sessions and remove private fixture files after testing.
