# Bilfunn — build notes and delivery document

Response to *Norwegian Vehicle Ownership & Information Platform, Development Brief v1.0*.

Two things are delivered here: a **working end-to-end product** (every screen in section 11 of the brief, running, with the subscription lifecycle actually executing), and the **written answers** the brief asks for in sections 20–22.

The prototype runs entirely in the browser with a simulated data provider and simulated payments. It is the product logic and the interface, ready to have real integrations dropped behind the adapters. Everything is stored per-browser, so your data and mine never mix.

---

## 1. What is built

| Brief requirement | Status in the prototype |
|---|---|
| Homepage hero + registration search | Plate-style input, normalisation (`ab 12345` → `AB12345`), format validation, loading state |
| Vehicle API integration | Simulated provider behind one adapter (`providerLookup`), normalised internal model, latency, 404 and 503 paths |
| Free preview | Make, model, year, body, colour — enough to confirm the right car |
| Paywall | Blurred locked section + price box stating all four commercial facts before the CTA |
| NOK 3 checkout | Vipps and card, Luhn validation, expiry/CVC checks, decline path, account created during checkout |
| 3-day access + NOK 249 renewal | Real state machine: `trialing → active → past_due → expired`, with dunning retries and grace period |
| Customer account | Status, price, next charge, payment method, receipts, search history, change card, cancel, resume, export, delete |
| Self-service cancellation | Two clicks, reason capture, confirmation email, access retained to period end |
| Admin dashboard | KPIs, funnel, customers, subscriptions, payments + refunds, search log, API health, email outbox, tickets, event log, editable commercial rules |
| Transactional emails | Ten templates, all visible in Admin → E-post |
| Terms / privacy / cookies | Plus withdrawal policy and a data-sources page, with the independence statement |
| Analytics | Full funnel event taxonomy, gated on consent — events log `sent: no` when consent is missing |
| Security / rate limiting | Per-IP hourly cap, per-account search limits, duplicate-search rule |
| Language | Norwegian Bokmål primary, English toggle in the header |

**Naming.** `Bilfunn` is a placeholder identity so the prototype is coherent — original logo (plate-derived mark), colours from your brief's deep blue / CTA blue / light blue-grey / white, one typeface family with a second width for the plate. Nothing from skiltregisteret.no or Statens vegvesen is reused. Swap in the final name and it's a token change.

### How to exercise it

1. Search any valid plate (`AB12345`). Roughly 1 in 17 plates deliberately returns *not found*, 1 in 41 returns *provider unavailable* — both paths are real.
2. Unlock for NOK 3. Card `4242 4242 4242 4242` approves; `4000 0000 0000 0002` declines.
3. Go to **Admin** (footer → Ansattinnlogging, code `1234`) → **+3 dager**. The introductory period ends, NOK 249 is charged, the renewal email appears in the outbox.
4. In Admin → Kunder, set *tving avslag* on a customer, then advance again: the subscription goes `past_due`, dunning retries are scheduled, the grace period runs, and it expires if all retries fail.
5. Admin → Innstillinger changes prices, periods, search limits, grace days and the cancellation rule. Nothing commercial is hard-coded.
6. Admin → Innstillinger → *Legg inn demodata* populates six customers in different lifecycle states.

---

## 2. Answers to the questions in section 21

### 2.1 Payment provider

**Recommendation: Vipps MobilePay Recurring API v3 directly for Vipps, plus Stripe Billing for cards. One internal subscription state machine owns the truth; both providers are adapters under it.**

Why not one provider for both: Vipps recurring runs on *agreements*, not tokenised cards, and the agreement lives partly inside the Vipps app. Routing it through a PSP adds a layer without removing the agreement semantics. Cards, meanwhile, are a solved problem in Stripe Billing.

Constraints from the Vipps Recurring API that shape the product — worth reading before the commercial rules are frozen:

- An agreement can carry an `initialCharge`, which is exactly the NOK 3 → NOK 249/month shape. <cite index="4-1">The agreement is drafted with an optional initialCharge that sets the upfront payment amount; if omitted, a zero-amount verification is performed instead</cite>.
- <cite index="7-1">New agreements default to delayed charges, which must be created one day before the due date; unscheduled charges require separate approval from Vipps MobilePay</cite>. So the renewal job must run at least a day ahead of the 72-hour boundary — build it as a scheduled job, not a cron that fires at the exact moment of expiry.
- <cite index="7-1">Vipps MobilePay retries failed charges for up to five days before marking them failed</cite>. Align our grace period with that rather than inventing a parallel retry schedule for Vipps (the prototype defaults to 5 grace days for this reason).
- Users can stop the agreement from inside the Vipps app, so <cite index="1-1">the `recurring.agreement-stopped.v1` webhook must be consumed and subscription status updated accordingly</cite> — otherwise we keep granting access to someone who has cancelled. This is not optional.
- <cite index="6-1">From 2025-12-09 the Recurring API rejects agreement creation for users under 18</cite>, which answers the minimum-age question in your section 6 for the Vipps path. Apply the same 18+ rule to cards for consistency.

Onboarding note: the merchant agreement and API keys come through the Vipps MobilePay merchant portal and take a few days; <cite index="10-1">after signing up you receive login details for portal.vippsmobilepay.com where the API credentials are available</cite>. Your authorised representative must complete this personally — it cannot be delegated to the developer.

### 2.2 Authentication

**Email magic link / one-time code, with the account created silently during checkout.** No password to forget, no registration step before payment, and it fits a product people use a handful of times. This is what the prototype implements.

Vipps Login is worth adding in phase 2 for people who paid with Vipps — it removes the email round-trip entirely. Email+password is the weakest option here: it adds a field to checkout and a password-reset flow to support, and buys nothing.

### 2.3 Data source — this is the critical dependency

The open Statens vegvesen API will not give you owner data. Their public single-lookup service is explicit: <cite index="11-1">the lookup returns an almost complete and current dataset about the vehicle, but you do not get owner information or information that can identify vehicle owners, and the service is capped at 50,000 calls per API key per day</cite>. Anyone can get a key for that one.

Owner information sits behind a separate, agreement-based interface (*Tekniske kjøretøyopplysninger med eierinformasjon*), which requires a company agreement with Statens vegvesen, organisation-number registration and authenticated access, with test access requested separately from production. **Nothing about the paid half of this product is safe to promise until that agreement is granted and its terms are read.**

Two further points the brief should absorb:

- <cite index="12-1">Statens vegvesen state that registration number and chassis number are themselves personal data, and that processing them is subject to the requirement of a legal basis under the Norwegian Personal Data Act</cite>. That applies to our search logs, not only to the report.
- The commercial terms of the owner-data agreement — whether data may be cached, resold, or displayed to consumers for a fee — are the real gate. A commercial reseller (there are several in the Norwegian market) may be faster to contract with than the source, at a per-call cost. Get written confirmation of displayable fields before any marketing copy is signed off.

**What I would do:** build against the open technical API immediately (it covers the whole free preview and most of the paid technical report), and treat the owner block as a separate feature flag that lights up when the agreement lands. The prototype is already structured this way — one adapter, one normalised model, the report renders whatever fields are present.

### 2.4 Usage, licensing and caching restrictions

Assume: no caching of owner data beyond the request, per-day call ceilings, attribution obligations, and a prohibition on bulk extraction. The 50,000/day ceiling on the open API is generous for a consumer product but is per key and will not survive a scraper. Budget for the paid API being priced per call, which makes the 50-lookups-a-month allowance a real cost line, not a formality.

### 2.5 Stack

- **Next.js (App Router) + TypeScript**, React server components for the content and SEO pages, client components for search and checkout.
- **PostgreSQL** (Neon or Supabase) with Prisma or Drizzle. Tables: `users`, `subscriptions`, `payments`, `searches`, `events`, `email_log`, `admin_audit`.
- **Vercel** for hosting, with separate dev / staging / production projects and environments.
- **Upstash Redis** for rate limiting and idempotency keys.
- **Resend** for transactional email (simplest DNS setup, good deliverability); Postmark if you want stronger transactional-only reputation.
- **Sentry** for errors, **Vercel Analytics** + **GA4 via Google Tag Manager** for the funnel, gated behind consent.
- **Cloudflare Turnstile** on the search box — invisible for real users, brutal on scrapers.

The subscription state machine belongs in our database, driven by provider webhooks. Never read subscription status live from a provider at page load: it is slow, it fails, and with two providers it is inconsistent.

### 2.6 Failed payments, grace and retries

Ledger both providers into one status. On first failure: mark `past_due`, keep access for a grace window, email immediately with a one-click link to update the payment method, retry on a fixed schedule, and expire if all retries fail. For Vipps, let their five-day internal retry run and treat their terminal webhook as our failure signal rather than retrying in parallel. Access ends at the grace boundary, not at the first failure — a declined card is usually a full card, not a departing customer.

### 2.7 Anti-scraping and fair use

Layered, and all present in the prototype in some form: per-account search quota, per-IP hourly cap, Turnstile on the search endpoint, server-side quota enforcement (never trust the client), velocity detection on sequential plate patterns, admin block with audit trail, and a hard daily ceiling that protects the upstream API quota even if everything else fails. Log the plate, the account and the time for every lookup: it is your evidence if a data subject complains, and it is required to show the processing was lawful.

### 2.8 Estimates

Developer-days for one experienced full-stack developer, excluding client-side waiting on agreements:

| Work | Days |
|---|---|
| Brand system, design tokens, responsive shell | 4–6 |
| Homepage, search, validation, preview, not-found paths | 4–5 |
| Vehicle API integration and normalisation layer | 5–8 |
| Checkout, Vipps Recurring agreements, Stripe Billing, webhooks | 10–14 |
| Subscription state machine, dunning, cancellation, grace | 5–7 |
| Customer account and self-service | 4–5 |
| Transactional email (10 templates, two languages) | 3–4 |
| Admin dashboard | 6–8 |
| Legal pages, consent, cookie management | 2–3 |
| Analytics and funnel instrumentation | 2–3 |
| Security, rate limiting, bot protection, monitoring | 3–4 |
| QA, accessibility, mobile passes, launch | 5–7 |
| **Total** | **53–74 days** |

Running costs at modest volume: hosting and database roughly NOK 500–1,500/month; email under NOK 300; Sentry free-to-low tier; card processing around 1.4–2.9% + fixed fee per transaction (the fixed fee is material on a NOK 3 charge — see below); Vipps per-transaction fees per your merchant agreement; **vehicle data per call, which is the variable you cannot estimate until the provider is chosen.**

### 2.9 What increases complexity or should be deferred

- **Owner data is the whole risk.** Everything else is routine. Ship the technical report first if the agreement is slow.
- **Two payment providers doubles the webhook surface.** If you must launch faster, launch Vipps-only — it is the dominant Norwegian consumer method and it covers the recurring model natively.
- **The NOK 3 charge loses money on cards.** A fixed per-transaction fee of NOK 2–3 means the introductory payment is roughly break-even at best. That is fine as customer acquisition, but it means card-fee-free methods and the conversion rate from intro to month two are the only things that matter commercially. Instrument that conversion from day one.
- **Defer to phase 2:** PDF reports, saved vehicles, ownership-change alerts, valuation, VIN lookup, B2B, CMS. None of them affect the core loop.

---

## 3. Legal and consumer-law notes

Norwegian and EU consumer rules are strict about exactly this business model, and the brief is right to insist on transparency. Specifics to build in — the prototype implements all of them:

- The renewal price, the renewal date and the cancellation route appear on the same screen as the pay button, above the fold, not behind a link.
- The confirmation email restates the renewal price and date.
- A reminder email goes out before the first NOK 249 charge. Not legally mandated in every reading, but it is the single biggest driver of chargebacks and complaints if absent.
- Cancellation is the same number of clicks as subscribing, self-service, with no retention interstitial that hides the confirm button.
- Right of withdrawal: digital content delivered immediately, with explicit consent to immediate delivery and acknowledgement that the right lapses — the checkbox wording in the prototype covers this and should be reviewed by your adviser.
- The independence statement from Statens vegvesen appears in the footer of every page and in the report itself.

**Do not launch owner-data display without a written opinion from a Norwegian lawyer.** Displaying a named individual's home address commercially is the highest-risk element of this product, and the risk sits with the business, not the data source.

---

## 4. What I need from you, in order

Blocking, in priority order:

1. **Final product name and domain**, plus registrar/DNS access. Everything else can start without it; branding cannot finish.
2. **Vehicle data decision.** Either apply for the Statens vegvesen owner-information agreement now (it takes weeks), or name a commercial reseller and get sandbox credentials. Also: written confirmation of which owner fields may be displayed commercially.
3. **Vipps MobilePay merchant agreement** — your authorised representative must complete business verification, identity and bank details. Start this in parallel; it is the longest pole after data access.
4. **Stripe account** (or confirmation we go Vipps-only for launch).
5. **Confirmation of the commercial rules** in the prototype's settings screen: is "3 days" exactly 72 hours (assumed yes), search limits (assumed 10 intro / 50 monthly), whether cancellation keeps access to period end (assumed yes), grace period (assumed 5 days, aligned to Vipps), one intro offer per customer (assumed yes).
6. **GitHub org + Vercel access**, both owned and billed by you.
7. **Free vs. paid field list** — signed off once the provider confirms what actually exists.
8. **Legal copy review** by your Norwegian adviser.

Please send credentials through a password manager invite rather than email or a spreadsheet — API secrets in a Google Sheet are a breach waiting to be reported.

Not blocking: logo and brand assets (the prototype's identity is a workable starting point if you want me to develop it), analytics accounts, Sentry, admin user list.

---

## 5. Honest caveats about this prototype

- Payments are simulated. No provider SDK is wired up; the checkout validates and branches exactly as the real one will, but nothing leaves the browser.
- Vehicle data is generated deterministically from the plate. Every "owner" is fictional. No real personal data appears anywhere.
- State is per-browser (`localStorage`), so it is a single-user demo, not a multi-user system. The production version needs the Postgres schema above.
- The simulated clock exists so the 3-day, 30-day and dunning logic can be reviewed in minutes. It goes away in production.
- Legal copy is template text written to be reviewed, not to be shipped.
