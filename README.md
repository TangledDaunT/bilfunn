# Bilfunn — source

Norwegian vehicle ownership & information platform, working MVP prototype.
Vanilla JS, no build step, no dependencies, no network calls.

## Files

| Path | What it is |
|---|---|
| `index.html` | The built, runnable app. Open it in a browser. |
| `src/01-shell-and-styles.html` | `<head>`, design tokens, all CSS, page shell, opening `<script>` |
| `src/02-core.js` | Storage, simulated clock, i18n (nb/en), analytics, email templates, plate parsing, simulated vehicle provider, subscription state machine, search limits |
| `src/03-home-search-paywall.js` | Header/footer/cookie chrome, router, homepage, search, vehicle preview, paywall |
| `src/04-checkout-report-account.js` | Checkout, payment confirmation, full vehicle report, login, customer account, cancellation flow |
| `src/05-content-and-legal.js` | Pricing, FAQ, how-it-works, about, contact, terms, privacy, cookies, refunds, data sources, 404 |
| `src/06-admin-and-boot.js` | Admin console (10 tabs), demo seed data, boot |
| `DELIVERY-NOTES.md` | Architecture, provider recommendations, estimates, open decisions |

## Build

`index.html` is just the concatenation of the parts:

```sh
{ cat src/01-shell-and-styles.html; \
  cat src/02-core.js src/03-home-search-paywall.js src/04-checkout-report-account.js \
      src/05-content-and-legal.js src/06-admin-and-boot.js; \
  printf '\n</script>\n</body>\n</html>\n'; } > index.html
```

Edit the parts, re-run, reload. Syntax check with `cat src/0[2-6]*.js | node --check /dev/stdin`.

## Running

Open `index.html` directly, or serve it: `python3 -m http.server 8000`.

Routing is hash-based (`#/`, `#/kjoretoy?nr=AB12345`, `#/konto`, `#/admin`), so it works from
`file://` and needs no server-side rewrite rules.

## Demo controls

- Card `4242 4242 4242 4242` approves, `4000 0000 0000 0002` declines.
- Vipps: any 8-digit number starting 4 or 9; `40000000` declines.
- Admin: footer → *Ansattinnlogging*, access code `1234`.
- Admin → **+1 / +3 / +31 dager** advances a simulated clock, which drives renewal,
  dunning and expiry. Admin → *Kunder* → *tving avslag* makes the next charge fail.
- Admin → *Innstillinger* edits prices, periods, search limits, grace days, cancellation rule.
  → *Legg inn demodata* seeds six customers across the lifecycle. → *Nullstill alt* wipes state.

## State

Everything persists in `localStorage` under the key `bilfunn.v1`, per browser. Wrapped in
try/catch so private-browsing mode degrades instead of crashing. There is no server.

## What is simulated

- **Payments.** No provider SDK. The checkout validates (Luhn, expiry, CVC) and branches
  exactly as the real one will, but nothing leaves the browser.
- **Vehicle data.** Generated deterministically from the plate hash in `buildVehicle()`.
  All owners are fictional. ~1 in 17 plates returns *not found*, ~1 in 41 returns
  *provider unavailable*, so both failure paths are reachable.
- **Clock.** `now()` = `Date.now() + S.clockOffsetMs`. Remove in production.

## Replacing the simulation

Three seams, in order of importance:

1. **`providerLookup(plate)`** in `02-core.js` — the only place vehicle data enters.
   Replace the body with a `fetch` to your backend; keep the returned shape
   (`{ok, status, vehicle, code, ms}`) and nothing else changes.
2. **`charge()` / `createSubscription()`** in `02-core.js` — replace with calls to
   Vipps Recurring agreements and Stripe Billing. `runBilling()` becomes a scheduled
   server job driven by provider webhooks rather than a function called on render.
3. **`load()` / `save()`** — swap `localStorage` for API calls against the Postgres
   schema described in `DELIVERY-NOTES.md`.

The commercial rules in `CFG_DEFAULT` are already configuration rather than code, which is
what the brief asks for — move that object to a database row and the admin settings screen
keeps working unchanged.

## Notes

- No real personal data appears anywhere in this package.
- Legal copy is template text written to be reviewed by a Norwegian adviser, not shipped.
- The identity ("Bilfunn", plate-derived mark, colour tokens) is original placeholder work.
  Nothing from skiltregisteret.no or Statens vegvesen is reused.
