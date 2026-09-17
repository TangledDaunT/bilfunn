# Frontend implementation and verification

Updated: 2026-09-18.

## Implemented

- Homepage, pricing, FAQ and contact pages based on the four supplied desktop Figma frames; shared header/footer, typography, colours, search controls and cards applied to existing application screens.
- 34 original exported assets (30 SVGs and four images; approximately 1.17 MB total), self-hosted fonts, lazy loading below the fold and short CSS transitions with reduced-motion support. No animation runtime or per-request SVG generation.
- Responsive layouts derived from the desktop design; no separate mobile Figma frame was supplied. Demo labels, unsupported owner-data promises and placeholder contact details were removed rather than published as facts. Exact visual parity across every screen is not certified.
- Google OIDC alongside existing email login: PKCE, state cookie, nonce, signed-token issuer/audience checks, single-use database attempts, session rotation and explicit authenticated account linking. Credentials remain private; no Google token is retained.
- Contact validation, announced errors and recovery after network failure. Pricing and payment behaviour retain existing backend integrations.

## Local evidence

- Production build completed successfully with Next.js 16.3.5.
- Eight unit tests and 32 PostgreSQL integration tests passed; ESLint completed without warnings. Google integration scenarios cover new customer login, replay rejection, existing-account protection, authenticated linking, bad browser state, expired attempts, provider rejection and cancellation alongside the existing security/payment suites.
- Browser walkthrough: desktop homepage and pricing rendered; FAQ category filtering worked; mobile homepage had no horizontal overflow; search with a disabled provider displayed temporary unavailability; login clearly reported unavailable Google configuration; empty contact submissions displayed field errors; a synthetic valid contact submission was accepted into the isolated local ticket store. This does not verify email delivery. No console errors were observed during these sampled checks.
- All exported assets are nonempty; SVG inspection found no scripts, foreign objects or event handlers.
- The latest full automated browser suite and production-build CSP browser checks still require a fresh run. Local browser sampling is not proof that every interaction is bug-free.

## Deployment and external verification gates

The linked Vercel project is `bilfunn`. Inspection found required Redis REST configuration and `DATA_ENCRYPTION_KEY` missing. Google and email credentials are also absent. No production deployment or production database migration was performed; startup safeguards must remain enabled.

Configure secrets directly in Vercel, complete the Google consent application and redirect URLs, and verify real Google sign-in, email delivery, payments and authorized vehicle lookups in provider test environments. The vehicle API key is intentionally pending. Then verify a preview, apply the release checklist in `RELEASE-STATUS.md`, and promote only after hosted recovery, cache isolation and staged load gates pass. No 500,000-user capacity claim has been made.
