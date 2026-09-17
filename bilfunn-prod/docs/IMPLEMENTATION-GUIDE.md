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
