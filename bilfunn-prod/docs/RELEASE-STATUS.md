# Release status — 17 September 2026

**Not approved for production release yet.** The application changes and local verification are complete enough for provisioned staging evaluation. No hosted capacity measurement or live-provider verification is claimed.

## Local evidence

| Check | Result |
| --- | --- |
| Locked clean installation | Passed (`npm ci`); Prisma client generated |
| TypeScript and ESLint | Passed |
| Production Next.js 16.3.5 build | Passed |
| Vitest unit tests | 6 passed |
| PostgreSQL integration tests | 25 passed against isolated PostgreSQL 15 |
| Production Playwright tests | 5 passed over local HTTPS |
| Fresh database migrations | Both migrations applied successfully |
| Backup restoration | Custom-format backup restored into a separate local database; table counts, constraints, migration history and receipt sequence verified |
| Dependency audit | 0 reported vulnerabilities in the resolved lockfile |
| Repository secret-pattern scan | Passed; `.env`, `.env.local`, load fixtures and generated test output are ignored |
| Credential-file permissions | New `.env` has mode 0600; existing secret values were not inspected or overwritten |
| Standalone prototype | No changes to root `src/` or `index.html` |

Tests cover email-based account takeover, challenge replay/brute force, session revocation, MFA replay, recent-authentication deletion, queued-data erasure, atomic quotas, duplicate payments/jobs, amount mismatches and rollback, canceled/deleted accounts, retryable cancellation, Stripe's introductory line item and return URL, Vipps capture/refund ordering and month-end periods, public-field isolation, XSS escaping, exact CSP hashes, suppression races, genuine modification dates, thin-page exclusions, expiry/outages, redirects, CSRF, honest HTTP status codes, and private nonce propagation.

These are focused regressions, not proof of the absence of all defects. CI configuration is added but has not been run by GitHub in this local session. Gitleaks runs in CI; its full history scan has not been executed locally. Organization repositories may need `GITLEAKS_LICENSE` for the supplied action, or an equivalent organization-approved CLI job.

## Gates still requiring your private environment

- Provision and approve Vercel Enterprise, Neon, Redis and QStash capacity, quotas and spending limits; no services were purchased or deployed.
- Complete server secrets and validate the actual SVV service type, schema, data-use rights, retention and quota. Live lookup/storage/publication remain disabled by default. The agreement-service adapter rejects unknown schemas; personal owner-data mapping/display remains disabled.
- Complete Stripe, Vipps, Resend and QStash test-environment verification, including missed webhooks, refunds and already-scheduled cancellation behavior. Confirm the business policy for access after a provider-issued refund.
- Verify real Vercel CDN cache hits, cache tags, immediate suppression purge, origin isolation, connection pooling, alert delivery and dead-letter recovery. Local HTTPS tests cannot establish CDN behavior.
- Rehearse migration, backup restore and deployment rollback on provisioned staging. The completed local database restoration is not a hosted deployment rollback rehearsal.
- Approve supplied editorial/legal copy and publish the twelve landing pages and blog articles when ready; placeholders stay unpublished.
- Run the distributed staged load, failure and soak scenarios and save latency/error/queue/memory evidence. No large-scale test has been run. Measured production capacity is **unknown**.

The chosen target remains 10,000 actions/second under the documented 95/4/1 mix, representing 500,000 active sessions averaging one action every 50 seconds. It does not establish 500,000 simultaneous in-flight requests or capacity for a different workload. Throttles and temporary-unavailability responses must be reported separately.

## Known operational limits

Unknown pre-reference checkout outcomes require provider reconciliation; after 20 hours, checkout creation is blocked to avoid exceeding provider idempotency retention. Vipps recurring charges also use deterministic provider order IDs. The outbox admits at most 10,000 pending/running jobs and dead-letters after eight failed attempts; operator recovery is required after exhaustion. Provider calls are capped at ten concurrently, reserving two slots for interactive traffic. These limits protect dependencies and require tuning based on actual staging measurements.

The compatible Next.js React lint plugins currently require ESLint 9; ESLint 10 failed their peer/runtime compatibility checks, so the working ESLint 9 release is retained as development tooling. QStash includes a deprecated `crypto-js` transitive dependency. Neither had a reported advisory in the final audit; monitor upstream updates. Public SEO content is original technical scaffolding; no competitor content was copied.

See [deployment instructions](../DEPLOYMENT.md) for configuration, fixture generation, tests, load criteria and recovery procedures.
