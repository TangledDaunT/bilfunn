# Bilfunn

Bilfunn is a static prototype for a Norwegian vehicle ownership and information platform. The project is intentionally dependency-free and runs entirely in the browser with simulated data.

## Product overview

- Search by vehicle registration plate
- Review a gated vehicle report
- Checkout with simulated payment flows
- Manage account and subscription state
- Browse legal, pricing and FAQ content
- Login to the admin interface with a demo code

## Project structure

- `index.html` — compiled app bundle
- `src/01-shell-and-styles.html` — global HTML shell and CSS tokens
- `src/02-core.js` — shared app state, simulated provider, i18n and billing logic
- `src/03-home-search-paywall.js` — home page, search flow and vault/paywall screens
- `src/04-checkout-report-account.js` — checkout, report, login and account flows
- `src/05-content-and-legal.js` — pricing, FAQ and legal pages
- `src/06-admin-and-boot.js` — admin screens and bootstrapping

## Run locally

Open `index.html` directly in a browser, or serve the folder with:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Build and verify

```bash
./scripts/build.sh
./scripts/check.sh
```

## Demo controls

- Card `4242 4242 4242 4242` approves
- Card `4000 0000 0000 0002` declines
- Vipps: any 8-digit number starting with `4` or `9`; `40000000` declines
- Admin code: `1234`

## Notes

This is a front-end prototype only. There are no real network calls or backend dependencies.
