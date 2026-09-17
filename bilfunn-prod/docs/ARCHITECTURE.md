# Architecture and data boundaries

## Public SEO

Uppercase registration paths are canonical; valid `/kjoretoy/<plate>` paths redirect permanently. Input is validated before lookup, without truncating malformed plates. Lowercase reserved editorial/account routes keep their meanings; personal plates that collide use uppercase paths (for example `/KONTO`). The search form always produces the uppercase registration URL.

Public route handlers return complete HTML and a hash CSP before streaming begins. They never read sessions or write per-view database records. Vercel caches them for at most five minutes, capped by record expiry, with vehicle and catalog purge tags. Private account/report pages use per-request nonce CSP and `private, no-store`. CDN behavior and immediate tag invalidation must be verified on Vercel itself.

Public records contain only registration, make/model, vehicle type, dates, colour, propulsion, inspection dates and status. They exclude owners, addresses, VIN, history and raw payloads. Provenance, fetch time, significant-change time, expiry and policy version are separate. Freshness refreshes after 24 hours (earlier for short retention); hard expiry never serves stale data. Provider failures return 503. Confirmed missing records return 404, suppression 404, and explicit removals 410. Thin real records return 200 with noindex.

Sitemaps use stable catalog-ID ranges of 10,000 records, bounded URL sizes, current policy eligibility and genuine change dates. Directories use keyset pagination. MFA-protected `/api/admin/seo` changes the policy and queues batched reevaluation; `/api/admin/vehicles` suppresses/removes records, clears stored data and purges public caches. Only approved Markdown is published.

## Authentication, billing and work queues

Email ownership is required before session creation or checkout. Database-backed opaque sessions are revocable; challenges have expiry, single-use atomic consumption, bounded attempts and shared throttles. Administrative rights require explicit provisioning plus TOTP. Destructive account actions require recent authentication. Browser mutations require the configured same origin; signed provider endpoints validate their own authentication.

Checkout stores consent and prices before calling a provider, with one pending checkout per user and stable idempotency keys. Payment events and payment identifiers are independently unique. Provider capture determines entitlement; receipts use a PostgreSQL sequence. Search quotas use transaction locks. Cancellation is durably retried and stopped agreements cannot be resumed locally. Reconciliation polls provider state through bounded jobs, recovering missing webhooks without inventing new charges.

Outbox payloads are encrypted, leased, retried with backoff, deduplicated and moved to dead state after eight failures. Successful jobs clear payloads. Account deletion clears queued personal email payloads and revokes sessions while preserving financial records needed for reconciliation. Deletion cannot recall an email already handed to the provider; configure provider retention separately.

Redis provides shared rate limits, miss locks, a rolling provider quota, circuit breaking and a ten-request upstream concurrency ceiling with two interactive slots reserved. Background quota stops at 80% of the configured allowance. Dependency failures fail closed. Limits are conservative starting values, not a validated throughput guarantee.
