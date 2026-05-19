# Dirt Cat Records

Static marketing site, PayPal checkout, Supabase-backed customer portal, Google Drive project folder automation, Resend transactional email, and a private owner admin dashboard for Dirt Cat Records.

## Current Source Of Truth

Use this checkout as the working repo:

```bash
cd /Users/jewelbait/Desktop/DirtCatRecords
```

Older local copies were archived outside this repo and should not be used for new work.

## Roadmap

The staged task list lives in [`docs/roadmap.md`](docs/roadmap.md).

The current priority is Stage 7: launch hardening across the live providers and production configuration.

## Execution Trail (Required)

Every implementation step must be logged with plan and codebase context checks.

Use:

- [`docs/execution-trail.md`](docs/execution-trail.md) for the required process.
- [`docs/execution-log.md`](docs/execution-log.md) as the append-only working log.

Minimum rule between steps:

1. Run a pre-step context check against plan + codebase.
2. Record what will be done.
3. Implement one bounded step.
4. Run post-step validation/context check.
5. Record what was done and what needs to be done next.

Architecture source-of-truth docs:

- `CONTEXT.md`
- `docs/adr/0001-paypal-metadata-versioning.md`
- `docs/adr/0002-payment-purpose-routing.md`
- `docs/adr/0003-delivery-lock-and-balance-gating.md`
- `docs/adr/0004-portal-action-validation.md`

## Runtime Overview

- `index.html`, `style.css`, and `spells.js` render the public marketing site and free mix review form.
- `checkout.html` and `checkout.js` build PayPal checkout orders through Vercel Functions.
- `success.html` and `success.js` show the post-payment order summary and portal/email-first next steps.
- `portal.html` and `portal.js` provide Supabase magic-link customer access, including quote cards, quote checkout, and balance payment start actions.
- `admin.html` and `admin.js` provide the owner operations dashboard, priority queue, project detail with status updates, private admin notes, final delivery controls, and extra revision actions, plus setup checks, sandbox test runs, and cleanup tools.
- `api/admin/quotes.js` provides protected admin quote draft and send actions.
- `api/portal/accept-quote.js` starts authenticated quote checkout from the portal.
- `api/portal/pay-balance.js` starts authenticated balance checkout from the portal.
- `api/` contains Vercel Functions.
- `lib/` contains PayPal, Supabase, Google Drive, Resend, auth, pricing, automation, and shared portal-rule helpers.
- `api/webhooks/paypal.js` and `lib/automation/studio-workflow.js` now process checkout, quote, and balance payments, including unlocking final delivery after full balance payment.
- `lib/paypal/client-factory.js` centralizes PayPal client setup.
- `lib/paypal/payment-router.js` centralizes payment-purpose routing.
- `lib/automation/delivery-lock.js` centralizes balance lock and post-payment status decisions.
- `supabase/schema.sql` contains the database schema and service-role access model.

## Required Environment Variables

Start from `.env.example`. The same values need to be configured in Vercel for deployed environments.

### Site And Admin

- `SITE_URL`: canonical production site URL, for example `https://dirtcatrecords.com`.
- `ADMIN_EMAIL`: owner email allowed to access admin APIs.
- `ALLOW_LOCAL_ADMIN_BYPASS`: set to `1` only for local development when you need admin access without a Supabase session.

### PayPal

- `PAYPAL_CLIENT_ID`: PayPal REST app client id.
- `PAYPAL_CLIENT_SECRET`: PayPal REST app secret.
- `PAYPAL_ENV`: `sandbox` or `live`.
- `PAYPAL_WEBHOOK_ID`: PayPal webhook id for signature verification.

Safety caveat: `PAYPAL_CLIENT_SECRET` must never be committed, exposed to browser/static JavaScript, or stored in client-visible environment variables. Keep it only in server-side Vercel environment variables.

### Supabase

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_PUBLIC_KEY`: public anon key used by browser auth.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service role key used by Vercel Functions.
- `SUPABASE_SECRET_KEY`: backward-compatible alias supported by older helpers; prefer `SUPABASE_SERVICE_ROLE_KEY`.

Safety caveat: `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SECRET_KEY` are server-only secrets. Do not expose them in browser JavaScript.

### Google Drive

- `GOOGLE_CLIENT_ID`: Google OAuth client id.
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
- `GOOGLE_REFRESH_TOKEN`: refresh token for Drive automation.
- `GOOGLE_DRIVE_PROJECTS_FOLDER_ID`: parent Drive folder id for project folders.
- `GOOGLE_OAUTH_SCOPE`: defaults to `https://www.googleapis.com/auth/drive`.

Generate a refresh token with:

```bash
npm run google:refresh-token
```

### Resend

- `RESEND_API_KEY`: Resend API key.
- `RESEND_FROM_EMAIL`: verified sender, for example `Dirt Cat Records <studio@dirtcatrecords.com>`.
- `RESEND_REPLY_TO_EMAIL`: reply-to address. Falls back to `ADMIN_EMAIL` when omitted.

### Optional Test Settings

- `TEST_BUSINESS_NAME`
- `TEST_CUSTOMER_EMAIL`
- `TEST_EMAIL_RECIPIENT`
- `TEST_SUBJECT_PREFIX`
- `TEST_DRIVE_FOLDER_PREFIX`

These are used by admin simulation/sandbox test runs.

### Stage 6 Follow-Up Cron

- `CRON_SECRET`: required token for protected follow-up cron route.

## Local Checks

```bash
npm test
npm run check:js
```

## Deployment Preflight

This repo is designed to stay within the Vercel Hobby limit of 12 Serverless Functions.

Run this before any production deploy:

```bash
npm run deploy:preflight
```

What it checks:

- function count under `/api`
- full test suite
- JavaScript syntax checks
- clean diff whitespace

If the function count ever exceeds 12 again, merge adjacent routes or upgrade the Vercel plan before deploying.

Deployment triage notes live in [`docs/deployment-preflight.md`](docs/deployment-preflight.md).

## V1 Dummy-Data Harness

Preferred local path: open `admin.html` and click `Run Owner Proof` in the `Setup & Sandbox` section.

That one click now:

- runs the deterministic `v1-usability` sandbox scenario;
- triggers checkout, quote, finals-lock, balance-payment, and final-approval automation;
- refreshes admin state and focuses the showcase project detail;
- renders customer-side portal preview cards directly inside admin so owner validation does not require swapping auth sessions.

Low-level API path is still available if needed. Use the admin setup endpoint with the `v1-usability` scenario to create deterministic sandbox artifacts that exercise checkout, quote, finals-lock, balance payment, and final approval behavior.

1. Start local runtime:

```bash
npx vercel dev
```

2. Run v1 scenario test run:

```bash
curl -sS -X POST "http://localhost:3000/api/admin/setup-wizard?action=test-runs" \
	-H "content-type: application/json" \
	-d '{
		"mode": "sandbox",
		"scenario": "v1-usability",
		"testRunId": "sandbox-20260519T120000-owner01"
	}'
```

3. Fetch run report:

```bash
curl -sS "http://localhost:3000/api/admin/setup-wizard?action=test-runs&testRunId=sandbox-20260519T120000-owner01"
```

4. Cleanup the same run:

```bash
curl -sS -X POST "http://localhost:3000/api/admin/setup-wizard?action=cleanup" \
	-H "content-type: application/json" \
	-d '{"testRunId":"sandbox-20260519T120000-owner01"}'
```

Expected report steps for v1 scenario:

- `sandbox_free_review`
- `sandbox_paid_project`
- `sandbox_quote_fixture`
- `sandbox_quote_payment`
- `sandbox_finals_ready_locked`
- `sandbox_balance_payment`
- `sandbox_final_approval`

## Local Vercel Runtime

```bash
npx vercel dev
```

Do not wrap `vercel dev` inside the `dev` npm script. Vercel treats a `dev` script as the project development command, which causes a recursive startup loop if that script also runs `vercel dev`.

## Stage 6 Follow-Up Automation

Protected cron endpoint:

- `GET /api/cron/follow-ups`

Behavior:

- default mode is `dryRun=true` (candidate preview only)
- `dryRun=false` queues follow-up jobs
- `dryRun=false&dispatch=true` queues and dispatches pending jobs

Example local dry-run:

```bash
curl -sS "http://localhost:3000/api/cron/follow-ups?dryRun=true" \
	-H "authorization: Bearer $CRON_SECRET"
```

Example local queue + dispatch:

```bash
curl -sS "http://localhost:3000/api/cron/follow-ups?dryRun=false&dispatch=true" \
	-H "authorization: Bearer $CRON_SECRET"
```

## Setup And Launch Checklist

1. Apply `supabase/schema.sql` to the target Supabase project.
2. Configure all required Vercel environment variables from `.env.example`.
3. Configure Supabase email auth and allowed redirect URLs for `SITE_URL`, `/portal.html`, and `/admin.html`.
4. Configure PayPal webhook delivery to `/api/webhooks/paypal`.
5. Verify Resend sender domain and reply-to address.
6. Generate and store the Google refresh token.
7. Open `/admin.html`, sign in as `ADMIN_EMAIL`, and run setup checks.
8. Run simulation mode.
9. Run sandbox mode before taking real customer payments.
10. Run `npm test` and `npm run check:js` before every deploy.

## Asset Notes

The repo currently tracks large WAV files under `assets/` for the listen section:

- `assets/Digital Dream .wav`
- `assets/SlowSwing.wav`
- `assets/Smells Like June.wav`

These make the repo and deploy payload large. Current decision: keep the WAV files for now, then replace the site previews with MP3 versions later.

Longer-term options:

- convert site previews to compressed audio such as MP3 or AAC and keep only the compressed files in git;
- move full-resolution WAV files to external storage/CDN and reference streamed preview files from the site;
- use Git LFS if the full WAV files must remain versioned with the repo.
