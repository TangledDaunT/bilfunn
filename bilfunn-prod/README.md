# Bilfunn

Norwegian vehicle lookup platform. Next.js 14 (App Router) + PostgreSQL + Prisma,
built to deploy on Vercel.

Search a Norwegian registration number → confirm the vehicle free → pay NOK 3 for
3 days → full report → automatic NOK 249/month until cancelled.

---

## What is real and what is pending

| Integration | State | To activate |
|---|---|---|
| **Technical vehicle data** | **Real.** Statens vegvesen open API, `GET /enkeltoppslag/kjoretoydata?kjennemerke=…`, header `SVV-Authorization: Apikey <key>`. Free key, 50 000 calls/key/24h. | Set `SVV_API_KEY`. Apply: https://www.vegvesen.no/kjoretoy/kjop-og-salg/kjoretoyopplysninger/api-er-for-tekniske-kjoretoyopplysninger/ |
| **Owner data** | **Not available on the open API.** Statens vegvesen state plainly that the open lookup returns no owner information and nothing that can identify an owner. | Requires the separate agreement-based interface (*Tekniske kjøretøyopplysninger med eierinformasjon*) or a commercial reseller. Then set `OWNER_API_KEY`, `OWNER_API_BASE_URL`, `OWNER_DATA_ENABLED=true` and confirm `mapOwner()` against a real payload. |
| **Vipps MobilePay** | Recurring API v3 client written against the documented contract. | Merchant onboarding at portal.vippsmobilepay.com, then set the five `VIPPS_*` keys and `PAYMENTS_MODE=vipps` (or `both`). |
| **Stripe (cards)** | Billing + Checkout written. | Set `STRIPE_*` keys and the two price IDs. |
| **Email** | Resend. Without a key, every message is written to `EmailLog` and visible in `/admin?t=epost`. | Set `RESEND_API_KEY` and verify the sending domain. |

**Nothing is a dead end without keys.** Missing vehicle credentials fall back to a
deterministic simulator (clearly labelled in the UI with a banner); missing payment
credentials use `PAYMENTS_MODE=mock`, which completes the purchase inline so the
full lifecycle — trial, renewal, dunning, cancellation — can be tested. Set the
key and the same code path goes live. No code changes.

---

## Getting started

```sh
cp .env.example .env.local        # fill in DATABASE_URL and SESSION_SECRET at minimum
npm install
npx prisma db push                # or: npx prisma migrate dev --name init
npm run seed                      # config row + admin users (DEMO=1 adds demo customers)
npm run dev
```

Open http://localhost:3000. Search `AB12345`, unlock, and you land on the report.
`/admin` is available to any email listed in `ADMIN_EMAILS` (log in first at `/logg-inn`).

Minimum required env: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`,
`NEXT_PUBLIC_BASE_URL`, `ADMIN_EMAILS`, `CRON_SECRET`.

---

## Architecture

```
src/
  app/                      App Router pages + route handlers
    page.tsx                homepage + plate search
    kjoretoy/[regnr]/       free preview + paywall
    rapport/[regnr]/        full report (server-enforced access check)
    kasse/ kvittering/      checkout + confirmation
    logg-inn/ konto/        magic-link auth, customer self-service
    admin/                  10-tab operations console
    api/
      checkout              creates user, subscription, first charge
      auth/*                magic link request + verify + logout
      subscription/cancel   self-service cancel (POST) and resume (DELETE)
      account/export|delete GDPR access + erasure
      vehicle/[regnr]       JSON lookup, paywall enforced server-side
      webhooks/stripe|vipps provider truth → our database
      cron/billing          hourly lifecycle tick (vercel.json)
  lib/
    vehicle/                svv.ts · owner.ts · simulated.ts → one normalised model
    payments/               stripe.ts · vipps.ts · mock.ts behind one interface
    billing.ts              subscription state machine, access rule, allowances
    email/                  templates + Resend sender, logged to DB first
    config.ts               commercial rules from DB, editable in /admin
    rateLimit.ts session.ts crypto.ts analytics.ts plate.ts money.ts
```

Three rules the code follows throughout:

1. **The database is the source of truth for access.** `hasAccess()` is the only
   place that decides, and we never ask Stripe or Vipps at page load.
2. **Vehicle and owner payloads are never persisted.** The search log stores the
   plate, the outcome and the latency. Registration numbers are personal data
   under Norwegian law, and IPs are stored only as a salted hash.
3. **Paywalls are server-side.** The report page and the JSON endpoint both check
   the subscription before the paid fields exist in the response.

---

## Subscription lifecycle

`TRIALING → ACTIVE → PAST_DUE → EXPIRED`, with `CANCELED` reachable from the first
three. Driven by `/api/cron/billing` (hourly) plus provider webhooks.

- Reminder email goes out `reminderHours` before the first renewal.
- Vipps charges are created **ahead** of the due date: standard agreements require
  at least a day's lead time, so the cron does not fire at the moment of expiry.
- Vipps retries a failed charge internally for up to five days. We do not run a
  competing retry loop against it; we wait for the terminal webhook. `graceDays`
  defaults to 5 to match.
- `recurring.agreement-stopped.v1` is load-bearing: users can cancel inside the
  Vipps app, and without it we would keep serving someone who has cancelled.
- Cancellation stops future charges immediately and keeps access to period end
  (`cancelKeepsAccess`, configurable).

Everything commercial — prices, days, search limits, grace, retry schedule — lives
in the `Config` table and is editable at `/admin?t=innstillinger`. No deploy needed.

---

## Compliance built in

- Renewal price, renewal date and cancellation route appear on the same screen as
  the pay button.
- Explicit consent to immediate delivery, which is what makes the withdrawal-right
  waiver valid for digital services.
- Cancellation is self-service and takes the same number of clicks as subscribing.
- Data export and erasure endpoints; payments are retained (anonymised) because
  the Bookkeeping Act requires it.
- Analytics load only after consent; the server-side event log never contains
  owner names, addresses or card details.
- The independence statement from Statens vegvesen is in the footer of every page
  and in the report.

**Do not enable `OWNER_DATA_ENABLED` without a written legal opinion.** Displaying
a named individual's home address commercially is the highest-risk element here,
and the risk sits with the business, not the data source.

---

## Verifying the SVV field mapping

`mapSvv()` walks a deeply nested response and every path is defensive, but the
mappings should be checked against a real payload before launch — the response
shape varies by vehicle type:

```sh
SVV_LOG_RAW=true npm run dev     # prints the raw JSON for each lookup
```

Compare against `src/lib/vehicle/svv.ts` and adjust. Fields that don't resolve
render as omitted rows rather than "undefined", so a mismatch degrades quietly
instead of breaking the page.

---

## Notes

- No caching of vehicle responses. If the contracted provider explicitly permits
  it, add it in `lib/vehicle/index.ts` and nowhere else.
- Rate limiting is Postgres-backed. Past a few requests/second, move it to Upstash
  Redis; the call signature is unchanged.
- The brand ("Bilfunn", the plate-derived mark, the colour tokens) is original
  placeholder work. Nothing from skiltregisteret.no or Statens vegvesen is reused.
