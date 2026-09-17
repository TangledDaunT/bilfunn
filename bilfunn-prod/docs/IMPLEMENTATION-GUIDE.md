# Implementation and maintenance guide

This guide documents the complete prototype1 implementation, including the existing standalone prototype. It maps each change to its files, responsibilities, security/data constraints, failure behavior and relevant checks. It is maintained alongside the 50-commit series; the final branch is the integration unit, not each intermediate snapshot.

## Read first

- [Repository handoff](../../AGENT-HANDOFF.md): architectural decisions and known unfinished work.
- [Architecture](ARCHITECTURE.md): public/private data boundaries, authentication, billing and background work.
- [Latest readiness pass](READINESS-PASS-2026-09-18.md): measured local results and explicit no-go conditions for real payments.
- [Deployment](../DEPLOYMENT.md): environment setup, migrations, queues and hosted verification.

The standalone root src/ and index.html are a browser-only simulation. The production Next.js application is bilfunn-prod/. Do not copy its local demo authentication or simulated payment behavior into production.

## Request and data flow

Public search normalizes a plate and redirects to a canonical public HTML handler. Public storage exposes only approved fields and enforces publication, retention and suppression. Those handlers avoid sessions so shared caching cannot expose private state. Paid reports use server-side identity, entitlement and atomic search allowances, with separate provider checks.

Email or Google verification creates an opaque revocable session. Checkout records accepted prices and consent before creating a provider request. Provider-confirmed payment state is deduplicated transactionally before entitlement changes and receipt jobs. Cron and signed queue callbacks drive durable cancellation, reconciliation, refresh and delivery. Timeouts or missing acknowledgments never establish that a financial side effect did not happen.

## Development workflow

Use Node 22+, npm ci, committed Prisma migrations, and a separately provisioned sk_test database. Integration tests delete records; do not run them against the active demo or a hosted production database. Use TEST_DATABASE_URL / TEST_DIRECT_URL and TEST_HTTP_PORT / TEST_HTTPS_PORT to isolate the test harness. Never print environment values or raw provider responses. Consult scripts/test-local.mjs before invoking it.

Run npm run lint, npm run typecheck, npm test, database integration tests and a production build as appropriate. Run browser tests against production output for CSP and rendering checks. Hosted capacity, real-provider delivery, pooler options, CDN purges and recovery need separate staging evidence. The dated report documents which checks were actually run.

## Subsystem reference

Every section corresponds to a focused commit. File paths are linked to the maintained source; removed routes are explicitly marked. Export names identify callable contracts, while the section's boundary notes describe how to use them safely.


## 01. Document repository boundaries and contributor rules

Separate the standalone prototype from the production application and preserve the architectural handoff.

**Contracts and failure behavior.** Read the handoff before editing; keep real credentials private and preserve existing uncommitted work. The handoff records known gaps rather than certifying release readiness.

**Verification.** Consult AGENT-HANDOFF.md and the dated readiness report before deployment.

| File | Responsibility and entry points |
| --- | --- |
| [AGENT-HANDOFF.md](../../AGENT-HANDOFF.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [AGENTS.md](../../AGENTS.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/AGENTS.md](../AGENTS.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/CLAUDE.md](../CLAUDE.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |

## 02. Pin the application toolchain and quality checks

Make installation, generation and static analysis repeatable with the resolved dependency tree.

**Contracts and failure behavior.** Use Node 22 or newer and npm ci. The lockfile is authoritative; do not infer framework behavior from older Next.js versions.

**Verification.** npm run lint; npm run typecheck; npm run build.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/eslint.config.mjs](../eslint.config.mjs) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/package-lock.json](../package-lock.json) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/package.json](../package.json) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/tsconfig.json](../tsconfig.json) | Configuration or support file for the behavior and checks described above. |

## 03. Model durable sessions billing and public vehicle records

Persist identity, payment, quota and publication state with explicit database constraints.

**Contracts and failure behavior.** Prices are integer ore; event/payment uniqueness and relations enforce integrity. Public records exclude raw provider payloads and owner identities.

**Verification.** Validate schema generation and inspect migration diffs before applying schema changes.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/prisma/schema.prisma](../prisma/schema.prisma) | Configuration or support file for the behavior and checks described above. |

## 04. Introduce the initial production database migration

Capture tables, indexes and receipt sequencing in a replayable migration.

**Contracts and failure behavior.** Apply migrations to an isolated empty database before staging. Never substitute a destructive schema reset for migration deployment.

**Verification.** Fresh local migration deployment passed in the readiness pass.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/prisma/migrations/202609170001_initial/migration.sql](../prisma/migrations/202609170001_initial/migration.sql) | Versioned schema transition; apply through Prisma migration deployment and retain historical ordering. |

## 05. Retain queue erasure guarantees in a database migration

Represent completed-job timestamps used by retention and erasure processing.

**Contracts and failure behavior.** Do not delete migration history after deployment; job cleanup must preserve payment reconciliation records.

**Verification.** Integration coverage includes queued-data erasure and job lifecycle behavior.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/prisma/migrations/202609170002_job_erasure/migration.sql](../prisma/migrations/202609170002_job_erasure/migration.sql) | Versioned schema transition; apply through Prisma migration deployment and retain historical ordering. |

## 06. Persist external identities and single-use OAuth attempts

Add Google identity links and replay-resistant authorization attempts without replacing email identity.

**Contracts and failure behavior.** Provider/subject and provider/user uniqueness prevent conflicting links. OAuth attempts expire and are consumed once.

**Verification.** Google authentication integration tests exercise linking and attempt replay.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/prisma/migrations/202609180001_google_identity/migration.sql](../prisma/migrations/202609180001_google_identity/migration.sql) | Versioned schema transition; apply through Prisma migration deployment and retain historical ordering. |
| [bilfunn-prod/prisma/migrations/migration_lock.toml](../prisma/migrations/migration_lock.toml) | Configuration or support file for the behavior and checks described above. |

## 07. Validate runtime configuration without exposing secrets

Report missing configuration before enabling production features.

**Contracts and failure behavior.** Only public base URL and analytics measurement IDs belong in NEXT_PUBLIC variables. Disabled provider modes remain available; mock payments must not run in production.

**Verification.** npm run config:check prints names/status only; current launch blockers remain documented.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/.env.example](../.env.example) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/.gitignore](../.gitignore) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/scripts/check-config.ts](../scripts/check-config.ts) | Operational command; inspect its environment and safety gates before execution. |
| [bilfunn-prod/src/instrumentation.ts](../src/instrumentation.ts) | Contracts: `register`. |
| [bilfunn-prod/src/lib/env.ts](../src/lib/env.ts) | Contracts: `env`, `securityConfigurationErrors`, `integrationStatus`, `queueConfigured`, `emailConfigured`. |

## 08. Bound database operations and seed configurable defaults

Limit stalled database work and align SQL timestamps with Prisma UTC values.

**Contracts and failure behavior.** Runtime uses DATABASE_URL; migrations use DIRECT_URL. Connections use UTC and bounded acquisition/query timeouts. Verify startup options on the hosted pooler. Seed is an upsert, not a commercial configuration reset.

**Verification.** Readiness integration tests exercise a slow query and subsequent health recovery.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/prisma/seed.ts](../prisma/seed.ts) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/src/lib/config.ts](../src/lib/config.ts) | Contracts: `AppConfig`, `getConfig`, `invalidateConfig`. |
| [bilfunn-prod/src/lib/db.ts](../src/lib/db.ts) | Contracts: `prisma`. |

## 09. Protect tokens and queued payloads with server-side cryptography

Centralize random tokens, constant-time comparison, hashing and encryption.

**Contracts and failure behavior.** Keep keys server-only. Store token hashes instead of bearer tokens; encrypted payloads still require retention and deletion policies.

**Verification.** Security unit tests and account/job integration tests cover relevant boundaries.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/lib/crypto.ts](../src/lib/crypto.ts) | Contracts: `sha256`, `hashIp`, `randomToken`, `randomCode`, `safeEqual`, `clientIp`. |
| [bilfunn-prod/src/lib/seal.ts](../src/lib/seal.ts) | Contracts: `seal`, `unseal`. |

## 10. Bound HTTP requests and standardize recoverable errors

Give clients finite waits and preserve useful status/retry information without exposing internal errors.

**Contracts and failure behavior.** JSON bodies have size/schema checks and a stream deadline. Browser mutations have a 15-second deadline. Payment response loss does not prove that no payment occurred. Money formatting is display-only; stored amounts remain ore.

**Verification.** Request-recovery unit tests cover retry headers, abort signals, oversized bodies and error redaction.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/lib/client-request.ts](../src/lib/client-request.ts) | Contracts: `clientRequest`, `retryMessage`. |
| [bilfunn-prod/src/lib/http.ts](../src/lib/http.ts) | Contracts: `HttpError`, `readBody`, `jsonBody`, `endpoint`. |
| [bilfunn-prod/src/lib/money.ts](../src/lib/money.ts) | Contracts: `ore`, `formatOre`, `vatOf`, `formatDate`. |
| [bilfunn-prod/tests/unit/request-recovery.test.ts](../tests/unit/request-recovery.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |

## 11. Enforce shared rate limits with actionable retry windows

Make request throttling block requests and communicate the actual wait.

**Contracts and failure behavior.** Production uses Redis and fails closed without it; PostgreSQL is a development fallback. Hot keys serialize writes and require load validation. Enforced limits raise 429 with Retry-After.

**Verification.** Local HTTP verification: five contact successes followed by 429 with a 3600-second wait.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/lib/rateLimit.ts](../src/lib/rateLimit.ts) | Contracts: `enforceRateLimit`, `rateLimit`, `pruneRateLimits`. |
| [bilfunn-prod/src/lib/redis.ts](../src/lib/redis.ts) | Contracts: `redis`, `distributedLimit`. |

## 12. Require verified email and revocable sessions for account access

Replace email-only trust with single-use challenges and server-side opaque sessions.

**Contracts and failure behavior.** Challenges expire, have bounded attempts and are atomically consumed. Cookies are HttpOnly, SameSite=Lax and Secure in production. Logout is idempotent; destructive actions require recent authentication.

**Verification.** Authentication integration tests cover takeover, replay and session revocation.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/auth/logout/route.ts](../src/app/api/auth/logout/route.ts) | HTTP POST handler for `/api/auth/logout`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/api/auth/request/route.ts](../src/app/api/auth/request/route.ts) | HTTP POST handler for `/api/auth/request`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/api/auth/verify/route.ts](../src/app/api/auth/verify/route.ts) | HTTP POST handler for `/api/auth/verify`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/api/session/route.ts](../src/app/api/session/route.ts) | HTTP GET handler for `/api/session`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/session.ts](../src/lib/session.ts) | Contracts: `createSession`, `getSession`, `destroySession`, `getUserId`, `getCurrentUser`, `requireAdmin`, `requireRecentUser`. |

## 13. Add verified Google sign-in with safe account linking

Implement OIDC login while protecting existing verified accounts.

**Contracts and failure behavior.** Validate PKCE, state, nonce, issuer, audience and signature. Linking an existing account requires a matching recent session; bounded redirects stay local.

**Verification.** Google unit and integration tests pass with mocked code exchange; real OAuth remains unverified.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/auth/google/callback/route.ts](../src/app/api/auth/google/callback/route.ts) | HTTP GET handler for `/api/auth/google/callback`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/api/auth/google/start/route.ts](../src/app/api/auth/google/start/route.ts) | HTTP GET handler for `/api/auth/google/start`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/google-auth.ts](../src/lib/google-auth.ts) | Contracts: `googleConfigured`, `googleRedirect`, `oauthCookie`, `safeLoginNext`, `googleIdentity`, `exchangeGoogleCode`. |
| [bilfunn-prod/tests/integration/google-auth.test.ts](../tests/integration/google-auth.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |
| [bilfunn-prod/tests/unit/google-auth.test.ts](../tests/unit/google-auth.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |

## 14. Require recent MFA for administrator operations

Provision administrator access explicitly and validate one-time authenticator codes.

**Contracts and failure behavior.** An email allowlist alone does not grant administrator access. Require recent authentication, protect the MFA secret, and prevent code-step replay.

**Verification.** Security integration tests cover MFA replay; provisioning must run privately.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/scripts/provision-admin.ts](../scripts/provision-admin.ts) | Operational command; inspect its environment and safety gates before execution. |
| [bilfunn-prod/src/app/api/auth/mfa/route.ts](../src/app/api/auth/mfa/route.ts) | HTTP POST handler for `/api/auth/mfa`; authorization, validation and failure policy are described above. |

## 15. Create idempotent Stripe checkout from accepted commercial terms

Build provider checkout using server-owned prices and stable request identities.

**Contracts and failure behavior.** Client amounts cannot select a price. A checkout redirect is not proof of payment; access depends on verified provider state. Keep disabled/mock adapters isolated from production.

**Verification.** Stripe checkout unit tests verify introductory line items and return behavior.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/lib/payments/index.ts](../src/lib/payments/index.ts) | Contracts: `availableMethods`, `getProvider`, `providerFor`. |
| [bilfunn-prod/src/lib/payments/stripe.ts](../src/lib/payments/stripe.ts) | Contracts: `stripe`, `stripeProvider`. |
| [bilfunn-prod/src/lib/payments/types.ts](../src/lib/payments/types.ts) | Contracts: `StartCheckoutInput`, `StartCheckoutResult`, `ChargeInput`, `ChargeResult`, `PaymentProvider`. |
| [bilfunn-prod/tests/unit/stripe-checkout.test.ts](../tests/unit/stripe-checkout.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |

## 16. Bound Vipps requests and verify webhook signatures

Support recurring-payment API calls with explicit deadlines and authenticated callbacks.

**Contracts and failure behavior.** Provider credentials remain server-only. HMAC validation binds body and request details; provider responses must be reconciled before entitlement changes.

**Verification.** Vipps state tests cover provider ordering; real callbacks and cancellation remain staging gates.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/lib/payments/vipps-signature.ts](../src/lib/payments/vipps-signature.ts) | Contracts: `verifyVipps`. |
| [bilfunn-prod/src/lib/payments/vipps.ts](../src/lib/payments/vipps.ts) | Contracts: `accessToken`, `vippsProvider`, `getVippsResource`, `getVippsChargePage`. |

## 17. Apply payment events once and verify Stripe webhook state

Persist deduplication before transactional payment side effects.

**Contracts and failure behavior.** Event IDs and payment IDs are independently unique. Amounts must match accepted terms; transactional receipt enqueueing must not duplicate email jobs on replay.

**Verification.** Payment/transaction integration tests cover duplicate events, mismatches and rollback.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/webhooks/stripe/route.ts](../src/app/api/webhooks/stripe/route.ts) | HTTP POST handler for `/api/webhooks/stripe`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/payments/events.ts](../src/lib/payments/events.ts) | Contracts: `once`, `applyPaid`. |

## 18. Reconcile missing and out-of-order provider events

Recover provider truth without inventing new charges or trusting stale callbacks.

**Contracts and failure behavior.** Use stable provider references and bounded reconciliation jobs. Refund, capture, cancellation and period ordering must preserve entitlement and ledger integrity.

**Verification.** Vipps-state integration tests cover capture/refund and month-end behavior; live provider checks remain open.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/webhooks/vipps/route.ts](../src/app/api/webhooks/vipps/route.ts) | HTTP POST handler for `/api/webhooks/vipps`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/payments/reconcile.ts](../src/lib/payments/reconcile.ts) | Contracts: `reconcileStripeInvoice`, `reconciliationPage`, `reconcileCheckout`, `reconcileVippsPayment`. |
| [bilfunn-prod/src/lib/payments/vipps-state.ts](../src/lib/payments/vipps-state.ts) | Contracts: `VippsCharge`, `reconcileVippsCharge`. |
| [bilfunn-prod/tests/integration/vipps-state.test.ts](../tests/integration/vipps-state.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |

## 19. Enforce atomic search allowances and durable cancellation

Keep concurrent searches within subscription limits and retry provider cancellation safely.

**Contracts and failure behavior.** Read Config on the server; lock subscription state before consuming quota. Cancellation is queued and may remain pending at the provider. New agreements cannot be resumed through local state alone.

**Verification.** Transaction tests cover concurrency, cancellation, expired access and quotas.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/subscription/cancel/route.ts](../src/app/api/subscription/cancel/route.ts) | HTTP POST, DELETE handler for `/api/subscription/cancel`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/billing.ts](../src/lib/billing.ts) | Contracts: `hasAccess`, `cancelSubscription`, `reconcileCancellation`, `searchAllowance`, `consumeSearch`, `runBillingCycle`, `scheduleCharge`. |
| [bilfunn-prod/tests/integration/transactions.test.ts](../tests/integration/transactions.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |

## 20. Validate checkout ownership consent and pending payment state

Persist accepted commercial terms before calling a payment provider.

**Contracts and failure behavior.** Require a verified user and matching email. Reuse pending checkout identities; ambiguous provider outcomes require reconciliation instead of a new charge.

**Verification.** Unauthenticated/cross-origin checkout and provider checkout unit tests are included in validation.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/checkout/route.ts](../src/app/api/checkout/route.ts) | HTTP POST handler for `/api/checkout`; authorization, validation and failure policy are described above. |

## 21. Protect account export and deletion with recent authentication

Provide bounded user-owned exports and erase personal operational data safely.

**Contracts and failure behavior.** Export only the requesting account. Deletion revokes sessions and queued personal payloads while retaining financial records needed for reconciliation; an already-dispatched email cannot be recalled.

**Verification.** Integration tests cover recent authentication and queued payload erasure.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/account/delete/route.ts](../src/app/api/account/delete/route.ts) | HTTP POST handler for `/api/account/delete`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/api/account/export/route.ts](../src/app/api/account/export/route.ts) | HTTP GET handler for `/api/account/export`; authorization, validation and failure policy are described above. |

## 22. Queue transactional email with bounded delivery and deduplication

Separate user-facing requests from durable email delivery.

**Contracts and failure behavior.** Login messages expire; delivery requires configured transport and production queue support. Message payloads and recipient addresses are sensitive and must not be logged.

**Verification.** Job and payment tests verify unique receipt jobs; real delivery is not proven by local login tests.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/lib/email/index.ts](../src/lib/email/index.ts) | Contracts: `sendEmail`, `deliverEmail`. |
| [bilfunn-prod/src/lib/email/templates.ts](../src/lib/email/templates.ts) | Contracts: `EmailType`, `renderEmail`. |

## 23. Run encrypted outbox jobs with leases retries and dead letters

Make background work recoverable after failures and duplicate deliveries.

**Contracts and failure behavior.** Claim work with bounded leases; retry with backoff, clear successful payloads and stop after the documented attempt limit. QStash callbacks require a valid signature.

**Verification.** Job integration tests cover duplicate work and erasure; operators must rehearse recovery in staging.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/jobs/route.ts](../src/app/api/jobs/route.ts) | HTTP POST handler for `/api/jobs`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/jobs.ts](../src/lib/jobs.ts) | Contracts: `Db`, `enqueue`, `processJobs`. |
| [bilfunn-prod/src/lib/wake-worker.ts](../src/lib/wake-worker.ts) | Contracts: `wakeWorker`, `publishWorker`. |
| [bilfunn-prod/tests/integration/jobs.test.ts](../tests/integration/jobs.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |

## 24. Schedule authenticated billing and expose bounded operations metrics

Drive billing/reconciliation through durable work and protected operational endpoints.

**Contracts and failure behavior.** CRON_SECRET protects cron and metrics. The minute schedule requires an appropriate hosting plan; local registration does not prove hosted execution. Do not log raw provider payloads.

**Verification.** Unauthorized cron requests return 401; hosted scheduling, alerts and capacity remain unverified.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/cron/billing/route.ts](../src/app/api/cron/billing/route.ts) | HTTP GET handler for `/api/cron/billing`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/api/ops/route.ts](../src/app/api/ops/route.ts) | HTTP GET handler for `/api/ops`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/operations.ts](../src/lib/operations.ts) | Contracts: `operationalMetrics`. |
| [bilfunn-prod/vercel.json](../vercel.json) | Configuration or support file for the behavior and checks described above. |

## 25. Probe dependencies and regress timeout and limiter recovery

Distinguish basic database health from full dependency readiness.

**Contracts and failure behavior.** Health returns 200/503 without connection details. Ready also checks security configuration and Redis; ingress controls are still needed for public probes.

**Verification.** Readiness tests assert real limiter waits and query recovery; stopping isolated PostgreSQL changed health from 200 to 503.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/health/route.ts](../src/app/api/health/route.ts) | HTTP GET handler for `/api/health`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/api/ready/route.ts](../src/app/api/ready/route.ts) | HTTP GET handler for `/api/ready`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/tests/integration/readiness.test.ts](../tests/integration/readiness.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |

## 26. Normalize plate inputs and preserve typed vehicle previews

Keep registration validation, provider selection and free-preview boundaries explicit.

**Contracts and failure behavior.** Do not truncate invalid input. Simulated data is non-production only; freePreview is not evidence that every public route uses the same paywall fields.

**Verification.** Vehicle-preview unit tests cover allowed preview fields and registration-year handling.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/lib/plate.ts](../src/lib/plate.ts) | Contracts: `normalizePlate`, `PlateKind`, `plateKind`, `isValidPlate`, `prettyPlate`. |
| [bilfunn-prod/src/lib/vehicle/index.ts](../src/lib/vehicle/index.ts) | Contracts: `lookupVehicle`, `freePreview`. |
| [bilfunn-prod/src/lib/vehicle/types.ts](../src/lib/vehicle/types.ts) | Contracts: `VehicleOwner`, `Vehicle`, `LookupResult`. |
| [bilfunn-prod/tests/unit/vehicle-preview.test.ts](../tests/unit/vehicle-preview.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |

## 27. Map technical provider responses and isolate owner-service access

Handle the actual SVV response shape without assuming technical access grants owner access.

**Contracts and failure behavior.** Treat HTTP 204 as not found, bound upstream calls and never persist raw responses. Owner mapping, imported-date semantics and complete tyre/rim arrays remain incomplete.

**Verification.** Use only supplied registration examples for live checks; mapping tests do not certify a provider contract.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/lib/vehicle/maskinporten.ts](../src/lib/vehicle/maskinporten.ts) | Contracts: `maskinportenToken`. |
| [bilfunn-prod/src/lib/vehicle/owner.ts](../src/lib/vehicle/owner.ts) | Contracts: `lookupOwnerVehicle`. |
| [bilfunn-prod/src/lib/vehicle/svv.ts](../src/lib/vehicle/svv.ts) | Contracts: `lookupSvv`, `mapSvv`. |

## 28. Gate public vehicle storage freshness and provider capacity

Publish only approved fields with explicit retention, policy and provider quotas.

**Contracts and failure behavior.** Separate fetched/changed/expiry dates; do not serve expired or suppressed data. Shared leases, quotas and circuit breaking protect upstream services. Cache invalidation must be verified on Vercel.

**Verification.** Public-data integration tests cover fields, suppression, expiry and policy changes.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/lib/public-cache.ts](../src/lib/public-cache.ts) | Contracts: `purgePublic`. |
| [bilfunn-prod/src/lib/vehicle/public-model.ts](../src/lib/vehicle/public-model.ts) | Contracts: `PublicData`, `publicFields`, `IndexPolicy`, `defaultPolicy`, `eligible`. |
| [bilfunn-prod/src/lib/vehicle/public-store.ts](../src/lib/vehicle/public-store.ts) | Contracts: `publicationEnabled`, `policy`, `refreshVehicle`, `publicSources`, `publicRecord`. |
| [bilfunn-prod/src/lib/vehicle/quota.ts](../src/lib/vehicle/quota.ts) | Contracts: `takeProviderQuota`, `providerFailure`, `providerLease`. |
| [bilfunn-prod/tests/integration/public-data.test.ts](../tests/integration/public-data.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |

## 29. Isolate opt-in local vehicle previews and demo login tools

Allow controlled local diagnostics without weakening production authentication or publication.

**Contracts and failure behavior.** Local preview requires explicit loopback-only development gates, bounded calls and no persistence. Demo login links are single-use; do not publish tokens or reset a demo account casually.

**Verification.** Local-preview unit tests cover production/host gates; the paid report remains a distinct flow.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/scripts/create-demo-account.mjs](../scripts/create-demo-account.mjs) | Operational command; inspect its environment and safety gates before execution. |
| [bilfunn-prod/scripts/dev-live.mjs](../scripts/dev-live.mjs) | Operational command; inspect its environment and safety gates before execution. |
| [bilfunn-prod/scripts/vehicle-api-preview.mjs](../scripts/vehicle-api-preview.mjs) | Operational command; inspect its environment and safety gates before execution. |
| [bilfunn-prod/src/lib/vehicle/local-preview.ts](../src/lib/vehicle/local-preview.ts) | Contracts: `localPreviewEnabled`, `localVehiclePreview`. |
| [bilfunn-prod/tests/unit/local-vehicle-preview.test.ts](../tests/unit/local-vehicle-preview.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |

## 30. Provide authenticated imports and isolated staging fixtures

Supply controlled data ingestion and repeatable load fixtures.

**Contracts and failure behavior.** Validate imported plates, bound batches and authorize imports. Staging fixtures must never be mistaken for live registry data or sent to real providers during load tests.

**Verification.** Run fixtures only in isolated staging; check-config reports the selected provider mode.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/scripts/import-vehicles.ts](../scripts/import-vehicles.ts) | Operational command; inspect its environment and safety gates before execution. |
| [bilfunn-prod/scripts/staging-fixture-server.mjs](../scripts/staging-fixture-server.mjs) | Operational command; inspect its environment and safety gates before execution. |
| [bilfunn-prod/scripts/staging-fixtures.ts](../scripts/staging-fixtures.ts) | Operational command; inspect its environment and safety gates before execution. |
| [bilfunn-prod/src/app/api/import/route.ts](../src/app/api/import/route.ts) | HTTP POST handler for `/api/import`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/vehicle/staging.ts](../src/lib/vehicle/staging.ts) | Contracts: `lookupStaging`. |

## 31. Control SEO eligibility and immediate vehicle suppression

Make publication policy editable by authenticated administrators with recent MFA.

**Contracts and failure behavior.** Queue bounded reindex work after policy changes. Suppression clears public data and purges cache tags; local behavior cannot certify CDN purge propagation.

**Verification.** Public-data and authorization tests cover policy and privacy boundaries.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/admin/seo/route.ts](../src/app/api/admin/seo/route.ts) | HTTP POST handler for `/api/admin/seo`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/api/admin/vehicles/route.ts](../src/app/api/admin/vehicles/route.ts) | HTTP POST handler for `/api/admin/vehicles`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/seo-reindex.ts](../src/lib/seo-reindex.ts) | Contracts: `reindex`. |
| [bilfunn-prod/src/lib/seo.ts](../src/lib/seo.ts) | Contracts: `pageMetadata`. |

## 32. Render shared public HTML with matching content security hashes

Serve session-free public pages with shared design markup and explicit metadata.

**Contracts and failure behavior.** Escape dynamic values, serialize structured data safely and hash the exact inline payload. Static marketing copy remains a documented commercial-consistency gap.

**Verification.** Browser tests verify public CSP and operation without JavaScript.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/components/DesignCta.tsx](../src/components/DesignCta.tsx) | React UI component; server-rendered presentation. |
| [bilfunn-prod/src/components/DesignFaq.tsx](../src/components/DesignFaq.tsx) | React UI component; client interaction/state boundary. |
| [bilfunn-prod/src/components/Footer.tsx](../src/components/Footer.tsx) | React UI component; server-rendered presentation. |
| [bilfunn-prod/src/components/Header.tsx](../src/components/Header.tsx) | React UI component; server-rendered presentation. |
| [bilfunn-prod/src/lib/design.ts](../src/lib/design.ts) | Contracts: `icon`, `logo`, `designHeader`, `designFooter`, `plateForm`, `priceCopy`, `searchCta`, `questions`, `faqMarkup`, `homepage`. |
| [bilfunn-prod/src/lib/public-html.ts](../src/lib/public-html.ts) | Contracts: `escapeHtml`, `searchForm`, `publicHtml`, `publicError`, `breadcrumb`. |

## 33. Route canonical vehicle searches through public HTML handlers

Replace conflicting page routes with complete public responses and canonical redirects.

**Contracts and failure behavior.** Normalize and validate plates before lookup; preserve honest 404/410/503 responses and never read sessions on cacheable public routes. Public API fields differ from paid-report data.

**Verification.** E2E tests verify canonical redirects, missing pages and disabled-provider responses.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/[slug]/route.ts](../src/app/[slug]/route.ts) | HTTP GET handler for `/[slug]`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/api/vehicle/[regnr]/route.ts](../src/app/api/vehicle/[regnr]/route.ts) | HTTP GET handler for `/api/vehicle/[regnr]`; authorization, validation and failure policy are described above. |
| `bilfunn-prod/src/app/kjoretoy/[regnr]/page.tsx` (removed) | Retired file; its replacement and behavior are described in this section. |
| [bilfunn-prod/src/app/kjoretoy/[regnr]/route.ts](../src/app/kjoretoy/[regnr]/route.ts) | HTTP GET handler for `/kjoretoy/[regnr]`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/kjoretoy/route.ts](../src/app/kjoretoy/route.ts) | HTTP GET handler for `/kjoretoy`; authorization, validation and failure policy are described above. |
| `bilfunn-prod/src/app/page.tsx` (removed) | Retired file; its replacement and behavior are described in this section. |
| [bilfunn-prod/src/app/route.ts](../src/app/route.ts) | HTTP GET handler for `/`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/sok/route.ts](../src/app/sok/route.ts) | HTTP GET handler for `/sok`; authorization, validation and failure policy are described above. |

## 34. Publish validated editorial content with sanitized HTML

Keep unpublished or malformed editorial content out of public pages.

**Contracts and failure behavior.** Validate frontmatter, require publication/length criteria, sanitize rendered Markdown and constrain slugs. Draft files are scaffolding, not approved legal or marketing claims.

**Verification.** Inspect rendered pages and sitemap membership when publishing content.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/blogg/[slug]/route.ts](../src/app/blogg/[slug]/route.ts) | HTTP GET handler for `/blogg/[slug]`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/blogg/route.ts](../src/app/blogg/route.ts) | HTTP GET handler for `/blogg`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/content.tsx](../src/lib/content.tsx) | Contracts: `FAQ_ITEMS`. |
| [bilfunn-prod/src/lib/editorial.ts](../src/lib/editorial.ts) | Contracts: `topics`, `article`, `articles`. |

## 35. Generate bounded sitemaps and exclude private crawl paths

Expose stable sitemap shards with current publication eligibility and modification dates.

**Contracts and failure behavior.** Use catalog ranges and keyset pagination. Disabled, expired, thin or suppressed data must not enter indexable sitemap output; kjoretoy remains the documented public directory.

**Verification.** Production robots and sitemap responses were fetched and saved in readiness evidence.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/robots.ts](../src/app/robots.ts) | Contracts: `dynamic`. |
| [bilfunn-prod/src/app/sitemap-pages.xml/route.ts](../src/app/sitemap-pages.xml/route.ts) | HTTP GET handler for `/sitemap-pages.xml`; authorization, validation and failure policy are described above. |
| `bilfunn-prod/src/app/sitemap.ts` (removed) | Retired file; its replacement and behavior are described in this section. |
| [bilfunn-prod/src/app/sitemap.xml/route.ts](../src/app/sitemap.xml/route.ts) | HTTP GET handler for `/sitemap.xml`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/sitemaps/[file]/route.ts](../src/app/sitemaps/[file]/route.ts) | HTTP GET handler for `/sitemaps/[file]`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/lib/sitemaps.ts](../src/lib/sitemaps.ts) | Contracts: `xml`, `loc`, `sitemapIndex`, `editorialSitemap`, `vehicleSitemap`. |

## 36. Expose MFA-protected administration and configurable commercial rules

Provide bounded administrative lists and validated configuration updates.

**Contracts and failure behavior.** UI visibility does not replace API authorization. Prices/limits are validated integer values; configuration changes need cache invalidation and truthful user disclosures.

**Verification.** Lint/build pass; authorization is checked server-side and the API has a per-admin limit.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/admin/ConfigForm.tsx](../src/app/admin/ConfigForm.tsx) | React UI component; client interaction/state boundary. |
| [bilfunn-prod/src/app/admin/error.tsx](../src/app/admin/error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/admin/loading.tsx](../src/app/admin/loading.tsx) | Server loading placeholder; keep its shape aligned with the final page and its status accessible. |
| [bilfunn-prod/src/app/admin/page.tsx](../src/app/admin/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/api/admin/config/route.ts](../src/app/api/admin/config/route.ts) | HTTP POST handler for `/api/admin/config`; authorization, validation and failure policy are described above. |

## 37. Render authenticated reports with quota checks and recovery states

Protect report data and distinguish invalid inputs, missing vehicles and upstream failures.

**Contracts and failure behavior.** Validate before streaming, check IP/subscription limits before disclosure, and do not charge quota for provider failures. Owner data remains explicitly unavailable.

**Verification.** Malformed report paths return 404; provider-integrated paid-report verification is still a launch blocker.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/rapport/[regnr]/error.tsx](../src/app/rapport/[regnr]/error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/rapport/[regnr]/layout.tsx](../src/app/rapport/[regnr]/layout.tsx) | Shared document/segment layout; validation here runs outside the segment loading boundary. |
| [bilfunn-prod/src/app/rapport/[regnr]/loading.tsx](../src/app/rapport/[regnr]/loading.tsx) | Server loading placeholder; keep its shape aligned with the final page and its status accessible. |
| [bilfunn-prod/src/app/rapport/[regnr]/page.tsx](../src/app/rapport/[regnr]/page.tsx) | Page entry point; server rendering and server-owned data access. |

## 38. Present checkout and receipts without assuming payment success

Show accepted terms and reconcile receipt status before offering paid access.

**Contracts and failure behavior.** A browser redirect or lost response cannot establish payment outcome. Report links disable speculative prefetch because rendering can consume allowance.

**Verification.** Checkout denial and error-recovery browser tests pass; live provider completion remains unverified.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/kasse/CheckoutForm.tsx](../src/app/kasse/CheckoutForm.tsx) | React UI component; client interaction/state boundary. |
| [bilfunn-prod/src/app/kasse/error.tsx](../src/app/kasse/error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/kasse/loading.tsx](../src/app/kasse/loading.tsx) | Server loading placeholder; keep its shape aligned with the final page and its status accessible. |
| [bilfunn-prod/src/app/kasse/page.tsx](../src/app/kasse/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/kvittering/error.tsx](../src/app/kvittering/error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/kvittering/loading.tsx](../src/app/kvittering/loading.tsx) | Server loading placeholder; keep its shape aligned with the final page and its status accessible. |
| [bilfunn-prod/src/app/kvittering/page.tsx](../src/app/kvittering/page.tsx) | Page entry point; server rendering and server-owned data access. |

## 39. Recover account actions and distinguish pending cancellation

Make cancellation, deletion and logout failures visible and retryable.

**Contracts and failure behavior.** Release busy state on errors; keep destructive-action errors inside dialogs. Pending provider cancellation is not a confirmed stop, and access text follows actual entitlement.

**Verification.** A clean development browser verified deletion network recovery and re-enabled controls.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/konto/AccountActions.tsx](../src/app/konto/AccountActions.tsx) | React UI component; client interaction/state boundary. |
| [bilfunn-prod/src/app/konto/error.tsx](../src/app/konto/error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/konto/loading.tsx](../src/app/konto/loading.tsx) | Server loading placeholder; keep its shape aligned with the final page and its status accessible. |
| [bilfunn-prod/src/app/konto/page.tsx](../src/app/konto/page.tsx) | Page entry point; server rendering and server-owned data access. |

## 40. Guide email and administrator login through recoverable forms

Provide Norwegian login feedback for invalid, expired, reused and throttled challenges.

**Contracts and failure behavior.** Read tokens only from the intended flow, constrain redirects and present actual rate-limit wait times. MFA setup remains an explicit administrator operation.

**Verification.** Production browser tests verify login network recovery and retry messaging.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/admin/mfa/MfaForm.tsx](../src/app/admin/mfa/MfaForm.tsx) | React UI component; client interaction/state boundary. |
| [bilfunn-prod/src/app/admin/mfa/error.tsx](../src/app/admin/mfa/error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/admin/mfa/loading.tsx](../src/app/admin/mfa/loading.tsx) | Server loading placeholder; keep its shape aligned with the final page and its status accessible. |
| [bilfunn-prod/src/app/admin/mfa/page.tsx](../src/app/admin/mfa/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/logg-inn/LoginForm.tsx](../src/app/logg-inn/LoginForm.tsx) | React UI component; client interaction/state boundary. |
| [bilfunn-prod/src/app/logg-inn/error.tsx](../src/app/logg-inn/error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/logg-inn/loading.tsx](../src/app/logg-inn/loading.tsx) | Server loading placeholder; keep its shape aligned with the final page and its status accessible. |
| [bilfunn-prod/src/app/logg-inn/page.tsx](../src/app/logg-inn/page.tsx) | Page entry point; server rendering and server-owned data access. |

## 41. Align informational pages and contact forms with available services

Present pricing, contact and service guidance with bounded submissions.

**Contracts and failure behavior.** How-it-works pricing comes from Config and no longer promises owner data or account-free checkout. Contact is validated server-side and rate-limited. Static shared pricing disclosures still need reconciliation.

**Verification.** Contact HTTP throttling and page/browser checks are documented in the readiness report.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/api/contact/route.ts](../src/app/api/contact/route.ts) | HTTP POST handler for `/api/contact`; authorization, validation and failure policy are described above. |
| [bilfunn-prod/src/app/faq/page.tsx](../src/app/faq/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/hvordan/error.tsx](../src/app/hvordan/error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/hvordan/loading.tsx](../src/app/hvordan/loading.tsx) | Server loading placeholder; keep its shape aligned with the final page and its status accessible. |
| [bilfunn-prod/src/app/hvordan/page.tsx](../src/app/hvordan/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/kontakt/ContactForm.tsx](../src/app/kontakt/ContactForm.tsx) | React UI component; client interaction/state boundary. |
| [bilfunn-prod/src/app/kontakt/page.tsx](../src/app/kontakt/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/om-oss/page.tsx](../src/app/om-oss/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/priser/error.tsx](../src/app/priser/error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/priser/loading.tsx](../src/app/priser/loading.tsx) | Server loading placeholder; keep its shape aligned with the final page and its status accessible. |
| [bilfunn-prod/src/app/priser/page.tsx](../src/app/priser/page.tsx) | Page entry point; server rendering and server-owned data access. |

## 42. Label legal drafts honestly and remove fabricated update dates

Stop legal pages from claiming they were updated every day.

**Contracts and failure behavior.** Legal copy remains a draft requiring business/legal approval; do not invent a revision date. Placeholder identity and static commercial terms remain release blockers.

**Verification.** All five legal pages hydrate without translation extensions; no warning suppression was added.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/app/angrerett/page.tsx](../src/app/angrerett/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/cookies/page.tsx](../src/app/cookies/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/datakilder/page.tsx](../src/app/datakilder/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/personvern/page.tsx](../src/app/personvern/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/app/vilkar/page.tsx](../src/app/vilkar/page.tsx) | Page entry point; server rendering and server-owned data access. |
| [bilfunn-prod/src/components/Legal.tsx](../src/components/Legal.tsx) | React UI component; server-rendered presentation. |

## 43. Add application-wide error recovery metadata and loading shells

Handle root/segment failures and provide stable page placeholders.

**Contracts and failure behavior.** Private pages use nonce CSP and no-store; browser mutations require the configured same origin. Global error UI must stand alone without relying on a working root layout.

**Verification.** Production build and CSP/browser tests pass; no ignoreBuildErrors setting is enabled.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/next.config.mjs](../next.config.mjs) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/src/app/error.tsx](../src/app/error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/global-error.tsx](../src/app/global-error.tsx) | Client error boundary; renders recovery controls without exposing internal exception details. |
| [bilfunn-prod/src/app/globals.css](../src/app/globals.css) | Shared styles and responsive/accessibility behavior; verify both desktop and narrow layouts after changes. |
| [bilfunn-prod/src/app/layout.tsx](../src/app/layout.tsx) | Shared document/segment layout; validation here runs outside the segment loading boundary. |
| [bilfunn-prod/src/app/opengraph-image.tsx](../src/app/opengraph-image.tsx) | Contracts: `alt`, `size`, `contentType`. |
| [bilfunn-prod/src/components/PageSkeleton.tsx](../src/components/PageSkeleton.tsx) | React UI component; server-rendered presentation. |
| `bilfunn-prod/src/middleware.ts` (removed) | Retired file; its replacement and behavior are described in this section. |
| [bilfunn-prod/src/proxy.ts](../src/proxy.ts) | Contracts: `proxy`, `config`. |

## 44. Respect consent and keep structured data and search inputs safe

Retain client interactivity only where state or browser events require it.

**Contracts and failure behavior.** Read consent after hydration, validate public analytics IDs, escape structured data and validate search navigation. Never put private credentials in client props.

**Verification.** Security tests and clean-browser CSP/hydration checks cover these boundaries.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/src/components/Analytics.tsx](../src/components/Analytics.tsx) | React UI component; client interaction/state boundary. |
| [bilfunn-prod/src/components/CookieBar.tsx](../src/components/CookieBar.tsx) | React UI component; client interaction/state boundary. |
| [bilfunn-prod/src/components/PlateSearch.tsx](../src/components/PlateSearch.tsx) | React UI component; client interaction/state boundary. |
| [bilfunn-prod/src/components/StructuredData.tsx](../src/components/StructuredData.tsx) | React UI component; server-rendered presentation. |
| [bilfunn-prod/src/lib/analytics.ts](../src/lib/analytics.ts) | Contracts: `track`. |

## 45. Ship local design assets fonts and optimized image derivatives

Remove avoidable image transfer and chained font discovery while preserving the design.

**Contracts and failure behavior.** Original exports remain available; WebP files are derived delivery assets. Fixed dimensions reduce shift, fonts are self-hosted and contrast adjustments improve readability.

**Verification.** Homepage Lighthouse improved from 72 to 94 performance and from 96 to 100 accessibility; CLS remained zero.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/public/bilfunn-mark.svg](../public/bilfunn-mark.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design.css](../public/design.css) | Shared styles and responsive/accessibility behavior; verify both desktop and narrow layouts after changes. |
| [bilfunn-prod/public/design/01ec1.svg](../public/design/01ec1.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/027c5.svg](../public/design/027c5.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/05b06.svg](../public/design/05b06.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/11c66.svg](../public/design/11c66.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/15f42.svg](../public/design/15f42.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/2b25e.svg](../public/design/2b25e.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/336bb.svg](../public/design/336bb.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/37c3c.svg](../public/design/37c3c.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/39494.svg](../public/design/39494.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/3f032.svg](../public/design/3f032.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/41f9b.svg](../public/design/41f9b.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/4b544.svg](../public/design/4b544.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/4d30d.png](../public/design/4d30d.png) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/4d30d.webp](../public/design/4d30d.webp) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/52575.svg](../public/design/52575.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/5a02c.svg](../public/design/5a02c.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/658e5.svg](../public/design/658e5.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/68c1d.svg](../public/design/68c1d.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/70034.svg](../public/design/70034.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/716f3.svg](../public/design/716f3.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/7daf0.svg](../public/design/7daf0.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/7e516.svg](../public/design/7e516.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/894ef.svg](../public/design/894ef.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/9181b.svg](../public/design/9181b.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/adb1e.png](../public/design/adb1e.png) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/adb1e.webp](../public/design/adb1e.webp) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/adcc5.svg](../public/design/adcc5.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/cbb9e.svg](../public/design/cbb9e.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/cde78.svg](../public/design/cde78.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/d7796.svg](../public/design/d7796.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/d9846.svg](../public/design/d9846.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/dec40.png](../public/design/dec40.png) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/dec40.webp](../public/design/dec40.webp) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/e1966.svg](../public/design/e1966.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/e6d05.png](../public/design/e6d05.png) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/e6d05.webp](../public/design/e6d05.webp) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/ef333.svg](../public/design/ef333.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/design/f6c3f.svg](../public/design/f6c3f.svg) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/fonts/Inter-LICENSE.txt](../public/fonts/Inter-LICENSE.txt) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/public/fonts/Manrope-LICENSE.txt](../public/fonts/Manrope-LICENSE.txt) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/public/fonts/fonts.css](../public/fonts/fonts.css) | Shared styles and responsive/accessibility behavior; verify both desktop and narrow layouts after changes. |
| [bilfunn-prod/public/fonts/subset-0.woff2](../public/fonts/subset-0.woff2) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/fonts/subset-1.woff2](../public/fonts/subset-1.woff2) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/fonts/subset-2.woff2](../public/fonts/subset-2.woff2) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/fonts/subset-3.woff2](../public/fonts/subset-3.woff2) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/public/public.css](../public/public.css) | Shared styles and responsive/accessibility behavior; verify both desktop and narrow layouts after changes. |

## 46. Add unpublished editorial landing-page drafts

Keep planned search content separate from approved production publication.

**Contracts and failure behavior.** Frontmatter publication gates, author requirements and minimum content rules determine visibility. Do not publish placeholders or unsupported owner-service claims without review.

**Verification.** Inspect editorial validation and generated sitemaps before setting published to true.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/content/blogg/.gitkeep](../content/blogg/.gitkeep) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/content/pages/bilinfo.md](../content/pages/bilinfo.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/bilnummer.md](../content/pages/bilnummer.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/bilregister.md](../content/pages/bilregister.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/bilskilt.md](../content/pages/bilskilt.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/eieropplysninger.md](../content/pages/eieropplysninger.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/heftelser.md](../content/pages/heftelser.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/hvem-eier-bilen.md](../content/pages/hvem-eier-bilen.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/kjoretoyopplysninger.md](../content/pages/kjoretoyopplysninger.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/registreringsnummer.md](../content/pages/registreringsnummer.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/regnr.md](../content/pages/regnr.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/regnummer.md](../content/pages/regnummer.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/content/pages/skiltnummer.md](../content/pages/skiltnummer.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |

## 47. Automate isolated local unit integration and browser verification

Make tests repeatable without touching the existing demo or live-provider environment.

**Contracts and failure behavior.** Use a dedicated sk_test database; destructive integration fixtures must never run on production. Configurable test ports keep the active preview available.

**Verification.** Final snapshot passed 17 unit, 35 integration and 8 production browser tests.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/playwright.config.ts](../playwright.config.ts) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/scripts/test-local.mjs](../scripts/test-local.mjs) | Operational command; inspect its environment and safety gates before execution. |
| [bilfunn-prod/tests/e2e/public.spec.ts](../tests/e2e/public.spec.ts) | Executable regression scenarios for this section; use the isolated environment described above. |
| [bilfunn-prod/tests/unit/security.test.ts](../tests/unit/security.test.ts) | Executable regression scenarios for this section; use the isolated environment described above. |
| [bilfunn-prod/vitest.config.mts](../vitest.config.mts) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/vitest.integration.config.mts](../vitest.integration.config.mts) | Configuration or support file for the behavior and checks described above. |

## 48. Run CI security checks and stage-only load scenarios

Codify quality checks and reproducible load/failure exercises.

**Contracts and failure behavior.** Never load-test production or real providers. Secret scanning is a pattern check, not proof that history is clean; distributed capacity requires measured evidence.

**Verification.** Local secret scan and dependency audit passed; hosted CI and distributed load are not claimed.

| File | Responsibility and entry points |
| --- | --- |
| [.github/workflows/production-checks.yml](../../.github/workflows/production-checks.yml) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/scripts/scan-secrets.mjs](../scripts/scan-secrets.mjs) | Operational command; inspect its environment and safety gates before execution. |
| [bilfunn-prod/tests/load/failure.js](../tests/load/failure.js) | Contracts: `options`. |
| [bilfunn-prod/tests/load/mixed.js](../tests/load/mixed.js) | Contracts: `options`, `pages`, `searches`, `accounts`. |

## 49. Record release evidence and unresolved production gates

Keep measured local results separate from approvals still needed for real billing.

**Contracts and failure behavior.** Read the newest dated report when older documents disagree. Provider verification, legal approval, hosted pooling/CDN recovery and realistic load remain open.

**Verification.** The readiness report includes command results, every changed file and saved Lighthouse/robots/sitemap evidence.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/DEPLOYMENT.md](../DEPLOYMENT.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/docs/ARCHITECTURE.md](ARCHITECTURE.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/docs/FRONTEND-VERIFICATION.md](FRONTEND-VERIFICATION.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/docs/READINESS-PASS-2026-09-18.md](READINESS-PASS-2026-09-18.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/docs/RELEASE-STATUS.md](RELEASE-STATUS.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |
| [bilfunn-prod/docs/readiness-2026-09-18/homepage.png](readiness-2026-09-18/homepage.png) | Static design/font asset; preserve accessibility, dimensions and the original source exports when regenerating. |
| [bilfunn-prod/docs/readiness-2026-09-18/lighthouse-home.html](readiness-2026-09-18/lighthouse-home.html) | Saved local verification artifact; evidence is specific to its environment and capture time. |
| [bilfunn-prod/docs/readiness-2026-09-18/lighthouse-home.json](readiness-2026-09-18/lighthouse-home.json) | Saved local verification artifact; evidence is specific to its environment and capture time. |
| [bilfunn-prod/docs/readiness-2026-09-18/robots.txt](readiness-2026-09-18/robots.txt) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/docs/readiness-2026-09-18/sitemap-pages.xml](readiness-2026-09-18/sitemap-pages.xml) | Configuration or support file for the behavior and checks described above. |
| [bilfunn-prod/docs/readiness-2026-09-18/sitemap.xml](readiness-2026-09-18/sitemap.xml) | Configuration or support file for the behavior and checks described above. |

## 50. Index the implementation guide and prototype branch handoff

Give maintainers one entry point for all subsystems and verification instructions.

**Contracts and failure behavior.** This branch is a 50-commit packaging of the existing implementation plus documentation. Intermediate snapshots are not certified independently buildable; validate the complete branch before deployment. Do not merge into main without a separate instruction.

**Verification.** Verify exactly 50 commits above the original main, a clean working tree, unchanged main and matching local/remote prototype1 tips.

| File | Responsibility and entry points |
| --- | --- |
| [bilfunn-prod/README.md](../README.md) | Maintainer guidance or gated editorial copy; retain its approval and verification limitations. |

### Existing modules retained unchanged

These source files were already present in the base commit and remain part of the implementation. Their inclusion here is documentation, not a claim of new implementation or fresh provider validation.

| File | Responsibility |
| --- | --- |
| [bilfunn-prod/src/app/cookies/ResetConsent.tsx](../src/app/cookies/ResetConsent.tsx) | Explicit user action that clears saved consent; storage access occurs in the click handler. |
| [bilfunn-prod/src/app/kjoretoy/[regnr]/UnlockButton.tsx](../src/app/kjoretoy/[regnr]/UnlockButton.tsx) | Legacy unlock UI retained in source; public vehicle routes now use route handlers, so do not assume it is mounted. |
| [bilfunn-prod/src/app/not-found.tsx](../src/app/not-found.tsx) | Designed missing-page UI with a new plate-search entry point. |
| [bilfunn-prod/src/app/rapport/[regnr]/PrintButton.tsx](../src/app/rapport/[regnr]/PrintButton.tsx) | Client print action for the current report; no independent data access or entitlement check. |
| [bilfunn-prod/src/components/Plate.tsx](../src/components/Plate.tsx) | Registration-tag presentation shared by React pages; callers validate plate input separately. |
| [bilfunn-prod/src/components/icons.tsx](../src/components/icons.tsx) | Contracts: `Check`, `Lock`, `Search`. |
| [bilfunn-prod/src/lib/payments/mock.ts](../src/lib/payments/mock.ts) | Non-production payment adapter. Returned synthetic references do not prove a real charge or refund. |
| [bilfunn-prod/src/lib/vehicle/simulated.ts](../src/lib/vehicle/simulated.ts) | Deterministic synthetic vehicle fixtures with simulated latency; excluded from production provider selection. |
| [index.html](../../index.html) | Generated standalone app, concatenated from root src fragments as documented in the root README; edit fragments rather than this output. |
| [src/01-shell-and-styles.html](../../src/01-shell-and-styles.html) | Prototype document shell, design tokens and styles; starts the concatenated browser app. |
| [src/02-core.js](../../src/02-core.js) | Prototype localStorage, simulated clock, language, vehicle/payment simulation and subscription state machine; not production security. |
| [src/03-home-search-paywall.js](../../src/03-home-search-paywall.js) | Prototype hash router, shared chrome, search preview and paywall. |
| [src/04-checkout-report-account.js](../../src/04-checkout-report-account.js) | Prototype checkout, report, login and account/cancellation simulation; no real payment processing. |
| [src/05-content-and-legal.js](../../src/05-content-and-legal.js) | Prototype informational pages and draft legal copy. |
| [src/06-admin-and-boot.js](../../src/06-admin-and-boot.js) | Prototype admin simulation, seed data and browser boot; its demo access code is not production authentication. |

### Documentation maintenance and release handoff

Update the corresponding section when a contract, input, security condition, deadline, retry rule or publication gate changes. Add targeted inline comments for non-obvious invariants rather than restating every line. Update tests when behavior changes, and date new verification evidence instead of overwriting an old run's meaning.

Current unresolved work is intentional and visible: real-provider payment/email/authentication checks, approved SVV mapping and data rights, legal identity and commercial-copy consistency, hosted pooling/cache/recovery tests and measured load. Do not replace those gates with successful local mocks or a clean build. Only prototype1 is requested for publication; main must remain untouched.
