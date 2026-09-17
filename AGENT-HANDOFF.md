# Skiltnummeret App Handoff

Updated 2026-09-18. Read this together with `AGENTS.md` before continuing. This is a factual handoff, not proof of production readiness. The user requested a fresh session because earlier answers overstated completion and caused confusion.

## Repository and scope

- Workspace: `/Users/shreyansh/Documents/bilfunn`.
- Production application: `bilfunn-prod/`, Next.js 16.3.5, React 19, TypeScript, Prisma/PostgreSQL, plain CSS.
- Root `src/` and generated `index.html` are a separate prototype. Leave them unchanged.
- Many existing modifications and untracked files belong to earlier work. Do not reset, overwrite, or assume they are committed.
- Read `bilfunn-prod/AGENTS.md` and relevant installed Next.js documentation before implementation.
- User wants precise Figma styling, working technical vehicle searches, email and Google authentication, secure billing, SEO, and eventual Vercel deployment. Preserve existing pricing: NOK 3 for three days, then NOK 249/month.
- Norwegian authentication was interpreted in prior discussion as Norwegian-language email-code login, not BankID.

## Local processes: checked when writing this file

| Port | Purpose | Current state |
| --- | --- | --- |
| 3000 | Older development instance | Listening; do not assume it matches the reviewed copy |
| 3100 | Isolated browser-review app, now live SVV local preview | Listening on 127.0.0.1 |
| 3102 | Separate raw technical API diagnostic | Listening on 127.0.0.1 |
| 55473 | Isolated PostgreSQL test instance | Used successfully by tests and demo provisioning; database/user `sk_test` |

The reviewed app runs from `/tmp/skiltnummeret-browser-qa`. Its `src/` is a COPY, not a symlink. After edits, sync production source into it:

```sh
cd /Users/shreyansh/Documents/bilfunn/bilfunn-prod
rsync -a src/ /tmp/skiltnummeret-browser-qa/src/
```

Other review dependencies/assets/scripts are linked to the production directory. Inspect the temporary directory before relying on this arrangement. Never copy private environment files into it.

To restart live local preview, stop only the process bound to 3100, then:

```sh
cd /tmp/skiltnummeret-browser-qa
node scripts/dev-live.mjs
```

`dev-live.mjs` loads the source project's private environment, then starts `test-local.mjs serve`. The harness retains an isolated DB, disables payments/email/Google/publication, and opts into `LOCAL_VEHICLE_PREVIEW` with the SVV key. Unlike ordinary `test-local.mjs serve`, this allows real technical lookups. It binds the development server to loopback.

## Important distinction: local preview is NOT the production report

- `src/app/[slug]/route.ts` branches into `src/lib/vehicle/local-preview.ts` only in explicitly enabled development mode, for the allowed localhost host, outside Vercel.
- This local branch calls `lookupSvv()` directly, skips payment for testing, shows mapped technical fields, and returns no-store/noindex HTML. It does not persist vehicle records or enable production publication.
- It limits lookups to 20 per process/module lifetime, one request at a time, with two seconds between requests. It is not a production quota implementation.
- The ordinary public path still uses `publicRecord()` and its storage/publication/validation gates. A pasted key alone does not enable it.
- `/rapport/[regnr]` is a separate paid report path and still uses `lookupVehicle()`. Because the harness keeps the production provider disabled, signing into the demo account does NOT automatically make that paid report flow work. This remains unfinished.
- The local preview lists only mapped fields. A missing displayed value can mean a mapping gap, not necessarily absence in SVV.
- Port 3102 runs `scripts/vehicle-api-preview.mjs`: complete technical JSON in a local form, no persistence, no owner API, bounded requests, origin/form-token checks. Start from `bilfunn-prod/` with `node scripts/vehicle-api-preview.mjs`.

## Actually verified live SVV evidence

The private API key successfully authenticated against the technical single-lookup endpoint. Neither the key nor raw responses should be printed or copied into documentation.

- `RL56841` returned HTTP 200 and a FORD Kuga.
- Browser verification through the homepage on port 3100 showed registration year 2021, black, petrol, automatic, and inspection deadline 2027-10-29. These are observed provider values, not an independent audit of correctness.
- `RL86541`, a different number shown in the user's screenshot address bar, returned HTTP 204.
- Fixed `lookupSvv()` to treat HTTP 204 as NOT_FOUND rather than failing JSON parsing.
- Do not invent example vehicles or enumerate registration numbers. Use user-specified numbers or clearly sourced examples.

## Credentials and configuration

- Private `.env` exists in `bilfunn-prod/`. Preserve it without displaying values. `.env.local` takes precedence.
- The user accidentally put a key into tracked `.env.example`; it was moved into private `.env` and removed from the example. The key was exposed during inspection. User was advised to rotate it before production. Rotation has not been confirmed.
- Technical API access does not provide owner names/addresses. Owner service requires its own agreement and Maskinporten integration. Owner access remains disabled.
- Do not infer storage, redistribution, owner-data permissions, or production quota from possession of a key.
- `npm run config:check` prints only names/status. Earlier normal local config checks found missing session/encryption/cron/direct-DB settings. The isolated test harness supplies test values; do not reuse them for production.

## Demo account and current login issue

- Synthetic customer: `demo@example.test`, in localhost `sk_test` only. No password, no administrator role.
- `scripts/create-demo-account.mjs` creates/resets a MOCK active subscription for 30 days and issues a single-use login link valid for 30 minutes. It hardcodes the isolated localhost database and refuses production/Vercel execution.
- Run from `bilfunn-prod/`: `node scripts/create-demo-account.mjs`.
- This command invalidates older unused demo links and resets subscription state/search count. Do not run it casually during cancellation/quota testing.
- User saw an expired/used/invalid link error. A fresh link was issued, but successful login with that newest link was NOT verified. Ambient browser state still pointed to an older token. Do not diagnose this as certainly expired without checking usedAt/expiry.
- Never copy previous tokens into a handoff or promise permanent demo credentials. Generate a fresh link only when needed. Once signed in, use `/konto`, not the consumed link.
- Real payments, provider cancellation, Google login, and email delivery are not enabled in the demo harness. A test subscription does not make all features verified.

## Figma/frontend work

Accessible reference: https://www.figma.com/design/D4oMLZtFheLtgWR8Nsb7Px/skiltnummeret---DESIGN--Copy-?node-id=0-1

Frames: homepage `2001:3`, pricing `2001:481`, FAQ `2001:668`, contact `2001:796`. Only desktop frames were found. Exact visual parity has NOT been certified.

- Shared markup/copy: `src/lib/design.ts`.
- Shared styling: `public/design.css`, `public/public.css`, existing application CSS.
- Original Figma exports: `public/design/` (30 SVGs, four images); self-hosted Inter/Manrope in `public/fonts/`.
- Homepage is raw server-generated HTML in `src/app/route.ts`, with public hash CSP and no session reads. React app pages use nonce CSP/private responses.
- Desktop/mobile sampling covered homepage, FAQ filtering, pricing, contact validation/submission, login disabled state, and vehicle lookup. Full browser regression and production CSP checks need rerunning after recent changes.
- Figma-derived assets are local static files. No animation library; short CSS transitions respect reduced motion.

## Pending mapper/paywall request: only partially implemented

The user's requested JSON was a literal `[FILL: SVV response JSON]`, not an attached response. Their example used English paths like `technicalData.general.brand[0].brand`, `tradeName[0]`, `registeredFirstNorwayDate`, and `tireAndRim.axleTireAndRimCombination`. Current live technical endpoint returns Norwegian keys. Do not blindly substitute English paths.

Completed partial changes:
- `freePreview()` returns only plate, make, model, bodyType, color, year. Year is a string derived from existing normalized `firstRegisteredNorway`.
- IMPORTANT: `freePreview()` currently has no production call sites. Changing it did NOT change public SEO fields, which still use `publicFields()`/`PublicData`. Resolve intended paywall scope explicitly without accidentally leaking paid fields or breaking SEO policy.
- Static owner note added before payment/public preview and in report/checkout; owner block removed from report. Exact requested text: `not available in this data source`.
- Report headings changed to Identity & registration, EU inspection, Technical specification, Approval & compliance. Approval section currently only has existing Euro class, not a completed compliance mapping.
- Homepage describes technical reports and no longer implies that payment unlocks owners.
- `inspectionOverdue` added to mapped vehicle, computed from current control deadline.

Still unfinished:
- Exact mapping audit/rewrite using actual response shape.
- Current `firstRegAbroad` uses `forstegangsGodkjenning.gyldigFraDato`; this may be approval validity, not foreign registration. `imported` derives from inequality with Norwegian date, so it requires correction/verification.
- Tire/rim mapper still selects the first combination/axle and exposes one `tyreDimension`. The requested complete array is NOT implemented.
- CO2, Euro class, classification and other missing fields may be mapping gaps.
- User asked not to introduce em-dashes and not to modify unrelated files.

## Authentication/backend architecture

- Email challenges and sessions: `src/app/api/auth/{request,verify}/route.ts`, `src/lib/session.ts`.
- Google OIDC implementation: `src/lib/google-auth.ts`, `src/app/api/auth/google/{start,callback}/route.ts`.
- Google uses PKCE, state/nonce, JOSE signature/issuer/audience verification, single-use DB attempts, and recent existing-account authentication before linking. Migration: `prisma/migrations/202609180001_google_identity/`.
- Real Google OAuth remains unverified; integration tests mock code exchange.
- Broader prior work added payment idempotency, rate limits, queues, SEO records, sitemaps, and release checks. Inspect actual code/tests rather than treating previous narrative as certification.

## Verification and deployment truth

Latest observed test run: 13 unit + 32 PostgreSQL integration tests passed. Type checking passed before the last new unit-test file. Production build and lint passed earlier in the frontend work, not after every latest local-preview change. Do not report a fresh production build without rerunning it.

Useful commands from `bilfunn-prod/`:

```sh
npm run typecheck
npm run lint
node scripts/test-local.mjs test
node scripts/test-local.mjs build
```

Tests modify/delete synthetic data. Read their setup before rerunning while the user tests the demo account.

Vercel project `bilfunn` is linked; CLI access worked earlier. Earlier inspection found required Redis REST credentials and DATA_ENCRYPTION_KEY absent, plus Google/email credentials. Recheck names/status only because configuration can change. No production deployment or production DB migration was performed in this work.

`README.md`, `DEPLOYMENT.md`, `docs/RELEASE-STATUS.md`, `docs/FRONTEND-VERIFICATION.md` contain useful background but some statements are stale: private SVV key is now configured and local live lookup works. This does not establish hosted readiness. No load-test evidence supports 500,000 users, and no claim of zero bugs/vulnerabilities is justified.

## Recommended continuation

1. Ask which concrete flow the user wants next, or resume their latest explicit request. Do not restart the whole project.
2. If demo login is the issue, inspect the current challenge/session safely and verify `/konto` in the browser. Avoid repeatedly reissuing links without diagnosing state.
3. Finish actual SVV field mapping and array preservation from a redacted response/schema; do not guess missing dates or owner fields.
4. Connect the authenticated report/search history flow in an explicitly isolated test configuration, preserving production authentication/payment rules.
5. Verify affected flows end-to-end, then document exact observed results and remaining configuration blockers.
