# Skiltnummeret.no

Production application: Next.js 16, React 19, TypeScript, PostgreSQL/Prisma, Redis, and QStash. The separate prototype in the parent directory is unchanged.

Pricing remains NOK 3 for three days, then NOK 249/month. Database configuration is authoritative; existing configuration is never overwritten by seeding.

## Local setup

Use Node.js 22+. Run `npm ci`, complete the ignored `.env`, run `npm run config:check`, then `npm run db:migrate`, `npm run seed`, and `npm run dev`.

The existing secret file is preserved. Next.js gives `.env.local` precedence over `.env`; remove conflicting settings yourself without sharing their values. Blank credentials disable optional services. Production startup rejects invalid security configuration. Configuration checks print field names and service status only.

Live vehicle lookup, storage, and publication are independent explicit gates. A standalone key does not establish permissions. Select `svv-technical` or `svv-owner` only after checking your actual service contract. The agreement/owner adapter currently supports only a validated technical response shape; personal owner fields remain disabled. Unknown payloads return temporary unavailability.

## Contributor commands

`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run build`, and `npm run test:e2e` provide local checks. Integration tests require an isolated `sk_test` PostgreSQL database. See [deployment and release instructions](DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md), and [release evidence](docs/RELEASE-STATUS.md).

The test harness blanks every credential before starting test processes, including values that might otherwise come from `.env.local`. Example local database: `postgresql://sk_test@127.0.0.1:55473/sk_test`. Override with `TEST_DATABASE_URL` and `TEST_DIRECT_URL` for another isolated instance. Never use production data.

## Content

The twelve requested landing pages are present as unpublished Markdown under `content/pages/`. Add approved copy and valid frontmatter, then set `published: true`. Blog articles use `content/blogg/<slug>.md` and additionally require `author`. Unpublished, invalid, or empty content returns 404 and stays out of sitemaps. Vehicle metadata is generated from permitted technical fields, without competitor content.

This code is not a claim of measured 500,000-user capacity. Deployment, private provider verification, restoration rehearsal on hosted infrastructure, and distributed staging tests remain release gates.

## Figma frontend and Google sign-in

The production frontend uses the supplied [Figma copy](https://www.figma.com/design/D4oMLZtFheLtgWR8Nsb7Px/skiltnummeret---DESIGN--Copy-?node-id=0-1). Original exports are in `public/design/`; local Inter and Manrope fonts are in `public/fonts/`. Shared styles are in `public/design.css`. SVG icons are served as static files, without server-side rendering or an animation library. Short CSS transitions respect reduced-motion preferences.

Google sign-in complements the Norwegian email-code flow. Configure a Google OAuth **Web application** with the exact redirect URL `<NEXT_PUBLIC_BASE_URL>/api/auth/google/callback`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` privately in your ignored environment file or Vercel environment settings. Use separate development and production credentials; register each authorized callback explicitly. Apply `npm run db:migrate` before enabling Google. Existing email accounts require a recent email sign-in before Google can be linked, preventing silent account merging.

For vehicle access, paste the key into the existing ignored `.env` field appropriate to your explicitly selected provider (see `.env.example` and `DEPLOYMENT.md`). Do not paste credentials into chat or commit them. Run `npm run config:check` after editing. Live-provider tests remain pending until configured.

For Vercel, use `bilfunn-prod/` as the application root, configure the required security/database/Redis variables and optional service credentials, apply migrations through a controlled release job, then create and verify a preview before promoting to production. See [frontend verification](docs/FRONTEND-VERIFICATION.md) for current results and blockers. A successful local build does not establish hosted production readiness.

## Public vehicle pages and administrator setup

Valid registration-number URLs render approved, cached technical vehicle data publicly when publication is enabled. A stored `PublicVehicle` snapshot is reused until its authorized retention window expires; only then may the provider be called again. Suppressed, expired, unverified, or insufficient records are not published or added to vehicle sitemaps. Owner names, addresses, lessee data, related-person data, and telephone numbers are never included in public HTML, metadata, structured data, or sitemaps.

Administrators use the email-code login followed by TOTP MFA; they do not use the demo password login. Add the address to `ADMIN_EMAILS`, then run `npm run admin:provision -- admin@example.com /private/secure/admin-mfa.txt` from `bilfunn-prod/`. Import the generated URI into an authenticator, remove the private file after verification, and complete the MFA challenge at `/admin/mfa`. `DEMO_LOGIN_EMAIL` and `DEMO_LOGIN_PASSWORD_HASH` are only for a controlled non-admin demo account and cannot authenticate an administrator.

## Private vehicle API diagnostic

Run `node scripts/vehicle-api-preview.mjs` from this directory, then open `http://127.0.0.1:3102/`. Enter a known conventional registration number to inspect the complete response from the technical single-lookup API. The tool reads `SVV_API_KEY` using Next's environment precedence (`.env.local` overrides `.env`). It does not enable production lookup, persist responses, call the owner-information service, or change publication permissions.

This separate test interface binds only to loopback, refuses production/Vercel execution, validates the request origin and a per-run form token, escapes response content, uses no-store/noindex headers, limits response sizes, and permits at most 20 requests per start. Stop it with Ctrl+C when finished. An authentication error means the key must be checked against the technical API subscription; no successful live lookup is claimed until a real plate has been submitted and the returned data compared.

To test live technical lookups through the normal homepage on port 3100, run `node scripts/dev-live.mjs`. This explicitly enables a development-only, loopback-bound report view using the private `SVV_API_KEY`, while retaining the isolated test database and disabling payments, owner access, persistence, and publication. It refuses production/Vercel use. The local report shows currently mapped fields; the separate port 3102 tool shows the complete technical response. Maximum 20 lookups per process, one at a time. Normal `test-local.mjs` runs continue to disable providers. SVV HTTP 204 responses are treated as missing vehicles rather than invalid JSON failures.

## Maintainer documentation

Start with [the implementation guide](docs/IMPLEMENTATION-GUIDE.md) for the module/file index, request and data boundaries, failure behavior, and verification commands. [The dated readiness pass](docs/READINESS-PASS-2026-09-18.md) separates local test evidence from unresolved production gates. The repository-root [handoff](../AGENT-HANDOFF.md) records prior decisions and known mapping limitations.

The `prototype1` branch packages the pending implementation in 50 focused commits. Only the complete branch is validated; individual intermediate commits can depend on later members of the series. This branch is not approval for real payments or a request to merge into `main`.
