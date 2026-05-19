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

The current priority is Stage 6: follow-up automation for missing files, pending quotes, unpaid balances, and final approval.

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

## Local Checks

```bash
npm test
npm run check:js
```

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
