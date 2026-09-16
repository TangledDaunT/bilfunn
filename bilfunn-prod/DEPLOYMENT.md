# Deploying to Vercel

## 1. Database

Neon, Supabase or Vercel Postgres. You need two URLs:

- `DATABASE_URL` — the **pooled** connection (pgbouncer), used by the app.
- `DIRECT_URL` — the direct connection, used by Prisma migrations.

```sh
npx prisma migrate dev --name init     # locally, creates prisma/migrations
git add prisma/migrations && git commit
```

`npm run build` runs `prisma generate`. Run `npx prisma migrate deploy` against
production once per schema change (add it as a Vercel build-command prefix or run
it from CI).

## 2. Project setup

```sh
vercel link
vercel env add DATABASE_URL production
# …repeat for each key in .env.example
vercel --prod
```

Set the same variables for the Preview environment, pointing at a separate
database. Never point preview at production data.

`NEXT_PUBLIC_BASE_URL` must be the real origin (`https://bilfunn.no`) — magic
links, Vipps redirect URLs and Stripe return URLs are all built from it.

## 3. Cron

`vercel.json` registers `/api/cron/billing` daily for Vercel Hobby compatibility.
On a plan that supports hourly cron jobs, change the schedule to hourly. Vercel sends
`Authorization: Bearer $CRON_SECRET`; the route rejects anything else. Verify
after the first deploy:

```sh
curl -H "Authorization: Bearer $CRON_SECRET" https://bilfunn.no/api/cron/billing
```

## 4. Webhooks

**Stripe** → `https://bilfunn.no/api/webhooks/stripe`, events:
`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
`customer.subscription.deleted`. Copy the signing secret to
`STRIPE_WEBHOOK_SECRET`.

**Vipps** → register in the merchant portal against
`https://bilfunn.no/api/webhooks/vipps`, events: `recurring.agreement-activated.v1`,
`recurring.agreement-stopped.v1`, `recurring.charge-captured.v1`,
`recurring.charge-failed.v1`, `recurring.charge-creation-failed.v1`. Put the
signing secret in `VIPPS_WEBHOOK_SECRET`.

Test in the Vipps test environment (`VIPPS_BASE_URL=https://apitest.vipps.no`)
before switching to `https://api.vipps.no`.

## 5. Email

Add the Resend domain, publish the SPF/DKIM records, verify, then set
`RESEND_API_KEY` and `EMAIL_FROM`. Until then every message is logged to the
database and visible in `/admin?t=epost` — useful for reviewing copy.

## 6. Go-live checklist

- [ ] `prisma migrate deploy` run against production
- [ ] `npm run seed` run once (creates the config row and admin users)
- [ ] `ADMIN_EMAILS` set, and each admin has logged in once
- [ ] `SESSION_SECRET` and `CRON_SECRET` are freshly generated, not the examples
- [ ] `SVV_API_KEY` set — confirm the demo banner is gone from the homepage
- [ ] Field mapping checked against real payloads (`SVV_LOG_RAW=true`)
- [ ] `PAYMENTS_MODE` set to a real provider — confirm the demo note is gone from checkout
- [ ] Webhook signatures verified with a test event from each provider
- [ ] A full purchase made with a real card and refunded
- [ ] Cancellation tested end to end, including the Vipps in-app cancel path
- [ ] Legal pages reviewed by a Norwegian adviser
- [ ] Owner data left disabled unless the agreement and legal opinion are in hand
- [ ] Sentry (or equivalent) connected and alerting to a monitored address
