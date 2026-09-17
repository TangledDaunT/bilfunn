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
