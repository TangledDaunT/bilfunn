# Production-readiness pass: 18 September 2026

**NO-GO for real payment keys today.** Local defects were fixed and tested. This is not certification that every requested production gate is complete.

AGENT-HANDOFF.md was read in full before edits. Existing uncommitted work was preserved. The root prototype was not changed. No hosted database, deployment, live payment, email, or vehicle-provider request was made by this pass. Tests used a new PostgreSQL cluster on loopback port 55474, database sk_test; the existing demo cluster on 55473 was left alone.

## A. Correctness and recovery

- All five legal pages rendered Norwegian text without hydration errors in a fresh Chromium context with extensions disabled. The reported translated-ltr/English-text mismatch did not reproduce. No hydration warning suppression was added.
- Removed the fabricated daily “last updated” line. The pages now explicitly say they are drafts awaiting review; no business-approved date was invented. Date formatting elsewhere now explicitly uses Europe/Oslo. Time reads used solely in server-side access/quota checks were retained; consent storage reads already happen in effects or event handlers.
- Login, checkout, contact, MFA, admin saving, logout, cancellation, and deletion requests now have a 15-second client deadline. Account/admin failures release their busy state and show recovery guidance. Deletion errors are visible in the dialog. Payment failures no longer claim that no payment occurred, and checkout avoids exposing raw server error codes.
- Root layout failures have a standalone global error page. Data-reading React page segments have error boundaries and loading placeholders. Recovery uses Next.js 16.3 retry(), which refetches server content.
- Malformed report identifiers are validated before loading content streams; /rapport/AB123456789 returned 404. Provider NOT_FOUND is handled separately from a provider outage. Ordinary missing URLs also returned 404.
- Report links no longer prefetch a quota-consuming report. The report enforces an IP limit before provider work and retains atomic subscription/trial allowance enforcement.
- Database connection acquisition and query deadlines are bounded. A PostgreSQL-side statement timeout prevents a timed-out query from occupying the connection until it finishes. A regression performs a deliberate slow query and checks subsequent health recovery. Pooler compatibility must still be checked in staging.
- Database sessions explicitly use UTC, matching Prisma timestamp fields. The HTTP contact test exposed a one-hour limit incorrectly advertising 6.5 hours when PostgreSQL used the machine's local timezone. The regression now checks the wait is at most one hour.
- Request-body streams now have a deadline as well as a size limit.
- Cancellation UI distinguishes queued cancellation from provider confirmation and respects whether access remains active. The “How it works” page now uses database pricing, requires login before payment, and no longer promises owner data.
- Existing payment replay/atomic quota tests pass. Stored payment event IDs, unique provider-payment IDs, transactional processing and receipt outbox keys remain in place. Payment amounts are integer ore and validated against accepted checkout terms; VAT rounding produces integer ore. Division by 100 in money.ts is display-only. This does not establish live-provider behavior.

## B. Rate limits

- Throttled API responses now preserve the actual remaining window in Retry-After. After the timezone fix, six local HTTP contact requests returned five 200 responses and one 429 with Retry-After: 3600. Login/contact/MFA/checkout/account/admin forms display it in Norwegian. Public lookup errors also preserve the wait.
- Added authorized-operation limits for account deletion, cancellation, session checks, and administrator configuration/SEO/vehicle operations. Existing auth, checkout, contact, export, import and discovery limits remain.
- Production already uses Redis and fails closed if it is unavailable. The request's description of a PostgreSQL-backed production limiter is stale. PostgreSQL is the development fallback; repeated writes to one key serialize on one row and are not evidence of high-throughput production capacity.
- Endpoint controls differ intentionally: email issuance 8/IP/hour and 5/address/hour; verification 30/IP/10 minutes and 10/address/10 minutes; MFA 5/user/5 minutes; contact 5/IP/hour; checkout 10/user/hour. Account and administrative limits are per authorized user. Public cache hits and signed service callbacks have different policies, described below.

## C. Security

- npm audit: zero reported vulnerabilities. Repository secret-pattern scan passed. This is not a full historical secret audit; the previously exposed SVV key still needs confirmed rotation.
- API authentication is server-side: checkout/cancellation/session require a user; export/deletion require recent login; administration requires admin role plus recent MFA. Auth endpoints are intentionally public. Logout remains idempotent when already logged out.
- Mutating browser requests pass the existing exact-origin and cross-site checks in proxy.ts; session cookies remain HttpOnly, Secure in production, SameSite=Lax. Cross-origin checkout returned 403; unauthenticated checkout and cron returned 401.
- JSON routes apply Zod validation or explicit bounded parameter checks; webhooks validate signatures and provider event structures. Empty-body operations do not need a JSON schema. Stored signing/event identities, not UI visibility, govern access.
- Raw SQL was manually inspected for interpolation: it uses tagged Prisma query parameters for values, with fixed SQL for locks, queue claims, rate-limit upserts, billing selection and sitemap shards. No unsafe raw-query interpolation was found in src. Operational contention/lock behavior still needs staged load testing.
- The only NEXT_PUBLIC values found in source are the public base URL and GA measurement ID. No secret-bearing public variable was found. Runtime error logging uses bounded event/status information in API wrappers.
- Browser CSP tests passed for public hash policies and private nonce policies. Fonts/assets are self-hosted. Actual analytics, Google OAuth, payment redirects and delivery services remain disabled/unverified in this test environment.

## D. Performance and UX

- Added static layout-shaped placeholders to the React routes that read data. Raw HTML route handlers cannot use React loading.tsx/error.tsx; their response/error handling must remain in their handlers.
- Added optimized WebP derivatives using the already-installed Sharp library. Original PNG exports remain unchanged. Moved font discovery out of a chained CSS import and preloaded the two Latin fonts. Slightly darkened low-contrast step numbers/link blue.
- Homepage mobile Lighthouse: performance **72 → 94**, accessibility **96 → 100**, best practices **100**, SEO **92**. LCP **5.3 → 3.1 seconds**, CLS **0**, TBT **0 ms**. These are individual local lab runs, not production field measurements. LCP still exceeds the 2.5-second “good” target; INP cannot be certified from this navigation-only run.
- A real authenticated paid report was not available with the isolated production providers disabled. No report Lighthouse score or live report success is claimed. A development account test verified that a dropped deletion request displayed an error and re-enabled the action.
- See [Lighthouse report](readiness-2026-09-18/lighthouse-home.html) and [homepage screenshot](readiness-2026-09-18/homepage.png).

## E. Deployment readiness and verification

- Lockfile and installed packages agree: Next.js 16.3.5, React/React DOM 19.2.4, Prisma/client 5.22.0. Prisma generate succeeded during production builds. Prisma migrate diff reports no difference between schema.prisma and the generated client's schema; textual differences are formatting/index ordering.
- All three committed migrations applied to fresh local PostgreSQL. prisma db push also completed against that same isolated real database. No assertion is made about earlier commands or the private hosted DATABASE_URL.
- Full npm run build succeeded after the final source changes, with zero TypeScript errors and no build warnings. ignoreBuildErrors is absent. ESLint passed.
- 17 unit tests, 35 PostgreSQL integration tests, and 8 production Playwright tests passed. Expected API-unavailable logs are from the deliberately disabled Redis/email transport; Playwright emits a terminal-color NO_COLOR/FORCE_COLOR warning, unrelated to application behavior. The tests do not prove absence of all defects.
- /robots.txt, /sitemap.xml and /sitemap-pages.xml were fetched from a production build. Private account/admin/checkout/report/receipt paths are disallowed. The sitemap implementation uses route handlers, not app/sitemap.ts. Disabled vehicle publication is absent from the sitemap. Test URLs use localhost deliberately; no production domain validation was performed.
- /api/health now queries PostgreSQL and returns only a simple 200/503 status. A live local check returned 200 before stopping the new isolated database and 503 after it was stopped. /api/ready separately checks configuration and Redis. Boot validation now rejects a missing/malformed PostgreSQL DATABASE_URL alongside existing runtime-security checks.
- The cron registration is present in vercel.json and unauthorized invocation returns 401. No hosted cron execution was tested.
- Added a generated PNG Open Graph image and favicon metadata using the existing brand asset. The image endpoint returned 200 image/png; public HTML references it. Administrator MFA now has explicit metadata.
- Prisma runtime uses DATABASE_URL; migrations use DIRECT_URL. URL acquisition/query defaults follow the [Prisma connector documentation](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql). No claim is made that the actual Vercel URL points to an approved pooler. The hosted pooler must accept UTC and statement-timeout startup settings, or equivalent database-role settings must be configured and verified before launch.

## Deliberately unresolved and remaining blockers

1. Complete session/encryption/cron/direct-database configuration. The current private config check reports SESSION_SECRET, DATA_ENCRYPTION_KEY, CRON_SECRET and DIRECT_URL missing/invalid; payments, Google and email are disabled. Hosted Vercel configuration was not refreshed in this pass.
2. Verify real Stripe/Vipps checkout, webhook replay, refund/cancellation ordering, queued email delivery, Google login and the authenticated vehicle report in provisioned staging. No provider credentials were enabled or invented. Mock/disabled modes were preserved.
3. Resolve the handoff's incomplete SVV mapping, paid-report/provider integration, approved storage/publication permissions and key rotation. Owner data remains unavailable.
4. Approve legal/business identity and commercial disclosures. Existing legal text still contains a placeholder organization number, static prices/search limits and a once-per-customer/payment-method trial promise whose full enforcement was not established. Static homepage/FAQ/CTA pricing can still diverge from Config after a price change. Only the how-it-works page was made configuration-driven here. These remaining cross-page commercial issues require a focused implementation/review before real billing; this pass does not mark them complete or approved.
5. Preserve /kjoretoy as the documented public vehicle directory. Blocking it in robots would contradict the existing SEO architecture; that part of the request was flagged, not silently applied. Sensitive /rapport and account routes remain private/noindex.
6. Validate actual hosted pooling, UTC timestamps, cancellation of slow queries, Redis/QStash capacity, CDN behavior, backup/restore/rollback and alerts. Ingress-level abuse controls for cache hits, health probes and signed callbacks must be exercised on the actual deployment. No claim is made that every endpoint has an identical application limiter or that production meets the earlier large-scale target.
7. Complete authenticated report performance/CSP verification and production field-vitals measurement. Homepage lab LCP is improved but remains above the good threshold. No 500,000-user capacity claim is supported.
8. Translation-extension behavior was not suppressed: it did not reproduce in the clean browser. The real legal-date defect was fixed separately.

## API inventory and control review

Session/role authorization is separate from rate limiting. Application limits are not a substitute for hosted ingress controls. Signed callbacks are intentionally not assigned low human-form quotas that could discard payment/job deliveries.

| API | Methods | Authorization / abuse controls |
| --- | --- | --- |
| account/delete | POST | Recent user; 5/user/minute |
| account/export | GET | Recent user; 20/user/hour; bounded section/cursor |
| admin/config | POST | Admin + MFA; 30/user/minute; Zod |
| admin/seo | POST | Admin + MFA; 30/user/minute; Zod |
| admin/vehicles | POST | Admin + MFA; 30/user/minute; Zod |
| auth/google/start | GET | Public OAuth initiation; 10/IP/10 minutes; state/PKCE |
| auth/google/callback | GET | Matching single-use state/cookie; bounded code; JWT verification; no independent limiter |
| auth/logout | POST | Same-origin; idempotent session removal; no independent limiter |
| auth/mfa | POST | Recent user/admin; 5/user/5 minutes; Zod |
| auth/request | POST | Public; IP + email limits; Zod |
| auth/verify | POST | Public; IP + email limits; challenge attempt/replay limits; Zod |
| checkout | POST | Verified user; 10/user/hour; Zod; server-owned prices |
| contact | POST | Public; 5/IP/hour; Zod and bounded body |
| cron/billing | GET | Timing-safe CRON_SECRET; durable deduplication; no human-form limiter |
| health | GET | Public database probe; bounded DB call; ingress protection still required |
| import | POST | Import bearer secret; 10/minute; Zod |
| jobs | POST | QStash signature; bounded body; durable queue limits |
| ops | GET | CRON_SECRET; bounded DB calls; no independent limiter |
| ready | GET | Public dependency probe; bounded calls; ingress protection still required |
| session | GET | Authenticated user; 120/user/minute |
| subscription/cancel | POST, DELETE | POST user + 10/user/minute + Zod; unsupported DELETE returns 409 |
| vehicle/[regnr] | GET | Public approved fields only; validated plate; cold discovery 30/IP/5 minutes; cache hits intentionally exempt; paid report has separate allowance |
| webhooks/stripe | POST | Stripe signature; bounded body; durable event/payment idempotency |
| webhooks/vipps | POST | HMAC signature, merchant check, Zod; durable event/payment idempotency |

## Full route and library inventory

The following lists include every current src/app file and src/lib file. Route handlers were enumerated before edits; new boundary/image/helper files are included in this final inventory.

### src/app

- `src/app/[slug]/route.ts`
- `src/app/admin/ConfigForm.tsx`
- `src/app/admin/error.tsx`
- `src/app/admin/loading.tsx`
- `src/app/admin/mfa/MfaForm.tsx`
- `src/app/admin/mfa/error.tsx`
- `src/app/admin/mfa/loading.tsx`
- `src/app/admin/mfa/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/angrerett/page.tsx`
- `src/app/api/account/delete/route.ts`
- `src/app/api/account/export/route.ts`
- `src/app/api/admin/config/route.ts`
- `src/app/api/admin/seo/route.ts`
- `src/app/api/admin/vehicles/route.ts`
- `src/app/api/auth/google/callback/route.ts`
- `src/app/api/auth/google/start/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/mfa/route.ts`
- `src/app/api/auth/request/route.ts`
- `src/app/api/auth/verify/route.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/contact/route.ts`
- `src/app/api/cron/billing/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/import/route.ts`
- `src/app/api/jobs/route.ts`
- `src/app/api/ops/route.ts`
- `src/app/api/ready/route.ts`
- `src/app/api/session/route.ts`
- `src/app/api/subscription/cancel/route.ts`
- `src/app/api/vehicle/[regnr]/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/webhooks/vipps/route.ts`
- `src/app/blogg/[slug]/route.ts`
- `src/app/blogg/route.ts`
- `src/app/cookies/ResetConsent.tsx`
- `src/app/cookies/page.tsx`
- `src/app/datakilder/page.tsx`
- `src/app/error.tsx`
- `src/app/faq/page.tsx`
- `src/app/global-error.tsx`
- `src/app/globals.css`
- `src/app/hvordan/error.tsx`
- `src/app/hvordan/loading.tsx`
- `src/app/hvordan/page.tsx`
- `src/app/kasse/CheckoutForm.tsx`
- `src/app/kasse/error.tsx`
- `src/app/kasse/loading.tsx`
- `src/app/kasse/page.tsx`
- `src/app/kjoretoy/[regnr]/UnlockButton.tsx`
- `src/app/kjoretoy/[regnr]/route.ts`
- `src/app/kjoretoy/route.ts`
- `src/app/kontakt/ContactForm.tsx`
- `src/app/kontakt/page.tsx`
- `src/app/konto/AccountActions.tsx`
- `src/app/konto/error.tsx`
- `src/app/konto/loading.tsx`
- `src/app/konto/page.tsx`
- `src/app/kvittering/error.tsx`
- `src/app/kvittering/loading.tsx`
- `src/app/kvittering/page.tsx`
- `src/app/layout.tsx`
- `src/app/logg-inn/LoginForm.tsx`
- `src/app/logg-inn/error.tsx`
- `src/app/logg-inn/loading.tsx`
- `src/app/logg-inn/page.tsx`
- `src/app/not-found.tsx`
- `src/app/om-oss/page.tsx`
- `src/app/opengraph-image.tsx`
- `src/app/personvern/page.tsx`
- `src/app/priser/error.tsx`
- `src/app/priser/loading.tsx`
- `src/app/priser/page.tsx`
- `src/app/rapport/[regnr]/PrintButton.tsx`
- `src/app/rapport/[regnr]/error.tsx`
- `src/app/rapport/[regnr]/layout.tsx`
- `src/app/rapport/[regnr]/loading.tsx`
- `src/app/rapport/[regnr]/page.tsx`
- `src/app/robots.ts`
- `src/app/route.ts`
- `src/app/sitemap-pages.xml/route.ts`
- `src/app/sitemap.xml/route.ts`
- `src/app/sitemaps/[file]/route.ts`
- `src/app/sok/route.ts`
- `src/app/vilkar/page.tsx`

### src/lib

- `src/lib/analytics.ts`
- `src/lib/billing.ts`
- `src/lib/client-request.ts`
- `src/lib/config.ts`
- `src/lib/content.tsx`
- `src/lib/crypto.ts`
- `src/lib/db.ts`
- `src/lib/design.ts`
- `src/lib/editorial.ts`
- `src/lib/email/index.ts`
- `src/lib/email/templates.ts`
- `src/lib/env.ts`
- `src/lib/google-auth.ts`
- `src/lib/http.ts`
- `src/lib/jobs.ts`
- `src/lib/money.ts`
- `src/lib/operations.ts`
- `src/lib/payments/events.ts`
- `src/lib/payments/index.ts`
- `src/lib/payments/mock.ts`
- `src/lib/payments/reconcile.ts`
- `src/lib/payments/stripe.ts`
- `src/lib/payments/types.ts`
- `src/lib/payments/vipps-signature.ts`
- `src/lib/payments/vipps-state.ts`
- `src/lib/payments/vipps.ts`
- `src/lib/plate.ts`
- `src/lib/public-cache.ts`
- `src/lib/public-html.ts`
- `src/lib/rateLimit.ts`
- `src/lib/redis.ts`
- `src/lib/seal.ts`
- `src/lib/seo-reindex.ts`
- `src/lib/seo.ts`
- `src/lib/session.ts`
- `src/lib/sitemaps.ts`
- `src/lib/vehicle/index.ts`
- `src/lib/vehicle/local-preview.ts`
- `src/lib/vehicle/maskinporten.ts`
- `src/lib/vehicle/owner.ts`
- `src/lib/vehicle/public-model.ts`
- `src/lib/vehicle/public-store.ts`
- `src/lib/vehicle/quota.ts`
- `src/lib/vehicle/simulated.ts`
- `src/lib/vehicle/staging.ts`
- `src/lib/vehicle/svv.ts`
- `src/lib/vehicle/types.ts`
- `src/lib/wake-worker.ts`

## Every file changed or added by this pass

This excludes modifications that were already present before the pass. No package or lockfile change was needed.

- `docs/READINESS-PASS-2026-09-18.md`
- `docs/readiness-2026-09-18/homepage.png`
- `docs/readiness-2026-09-18/lighthouse-home.html`
- `docs/readiness-2026-09-18/lighthouse-home.json`
- `docs/readiness-2026-09-18/robots.txt`
- `docs/readiness-2026-09-18/sitemap-pages.xml`
- `docs/readiness-2026-09-18/sitemap.xml`
- `playwright.config.ts`
- `public/design.css`
- `public/design/4d30d.webp`
- `public/design/adb1e.webp`
- `public/design/dec40.webp`
- `public/design/e6d05.webp`
- `scripts/test-local.mjs`
- `src/app/admin/ConfigForm.tsx`
- `src/app/admin/error.tsx`
- `src/app/admin/loading.tsx`
- `src/app/admin/mfa/MfaForm.tsx`
- `src/app/admin/mfa/error.tsx`
- `src/app/admin/mfa/loading.tsx`
- `src/app/admin/mfa/page.tsx`
- `src/app/api/account/delete/route.ts`
- `src/app/api/account/export/route.ts`
- `src/app/api/admin/config/route.ts`
- `src/app/api/admin/seo/route.ts`
- `src/app/api/admin/vehicles/route.ts`
- `src/app/api/auth/google/start/route.ts`
- `src/app/api/auth/mfa/route.ts`
- `src/app/api/auth/request/route.ts`
- `src/app/api/auth/verify/route.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/contact/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/import/route.ts`
- `src/app/api/session/route.ts`
- `src/app/api/subscription/cancel/route.ts`
- `src/app/api/vehicle/[regnr]/route.ts`
- `src/app/error.tsx`
- `src/app/global-error.tsx`
- `src/app/hvordan/error.tsx`
- `src/app/hvordan/loading.tsx`
- `src/app/hvordan/page.tsx`
- `src/app/kasse/CheckoutForm.tsx`
- `src/app/kasse/error.tsx`
- `src/app/kasse/loading.tsx`
- `src/app/kontakt/ContactForm.tsx`
- `src/app/konto/AccountActions.tsx`
- `src/app/konto/error.tsx`
- `src/app/konto/loading.tsx`
- `src/app/konto/page.tsx`
- `src/app/kvittering/error.tsx`
- `src/app/kvittering/loading.tsx`
- `src/app/kvittering/page.tsx`
- `src/app/layout.tsx`
- `src/app/logg-inn/LoginForm.tsx`
- `src/app/logg-inn/error.tsx`
- `src/app/logg-inn/loading.tsx`
- `src/app/opengraph-image.tsx`
- `src/app/priser/error.tsx`
- `src/app/priser/loading.tsx`
- `src/app/rapport/[regnr]/error.tsx`
- `src/app/rapport/[regnr]/layout.tsx`
- `src/app/rapport/[regnr]/loading.tsx`
- `src/app/rapport/[regnr]/page.tsx`
- `src/components/Legal.tsx`
- `src/components/PageSkeleton.tsx`
- `src/lib/client-request.ts`
- `src/lib/db.ts`
- `src/lib/design.ts`
- `src/lib/env.ts`
- `src/lib/http.ts`
- `src/lib/money.ts`
- `src/lib/public-html.ts`
- `src/lib/rateLimit.ts`
- `src/lib/vehicle/public-store.ts`
- `tests/e2e/public.spec.ts`
- `tests/integration/readiness.test.ts`
- `tests/unit/request-recovery.test.ts`

## Local handoff

Production source was synced into the existing /tmp/skiltnummeret-browser-qa/src copy as instructed by AGENT-HANDOFF.md. No private environment files were copied and its server was not restarted. The isolated verification servers were stopped; the new test cluster on 55474 was stopped after the health-failure check. The existing demo database on 55473 and preview process on 3100 were preserved.
