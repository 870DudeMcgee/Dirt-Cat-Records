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

## End Product Goal

The target end product is a reliable studio operations system for Dirt Cat Records that:

- captures new paid work through PayPal checkout;
- converts free reviews and custom inquiries into tracked Projects and Quotes;
- gives customers a real portal for uploads, revisions, quote acceptance, balance payment, and final approval;
- gives the owner a private admin dashboard for day-to-day operations;
- automates Google Drive folder creation, transactional email, payment-state transitions, delivery locking, and stale-project follow-ups;
- stays safe to operate on the Vercel Hobby plan with documented and enforced deploy guardrails.

## Current Status

- Stages 0 through 6 are implemented and covered by the current automated test suite.
- The V1 owner-proof sandbox harness is implemented and documented.
- Deploy guardrails are active: portal payment starts were consolidated into `api/portal/actions.js`, the repo stays under the 12-function Hobby limit, and `.husky/pre-push` runs `npm run deploy:preflight` before push.
- The repo now includes workspace-level VS Code settings, reusable tasks, and extension recommendations for the Vercel, PayPal, Supabase, GitHub PR, GitHub Actions, and Prettier workflow.
- The workspace recommendations now also include GitLens for repo-history inspection and Thunder Client for repeatable local/preview API checks.
- GitHub Actions now runs the same `npm run deploy:preflight` guardrail on `push` to `main` and on pull requests.
- The local credential sanity gate now passes with the live Google Drive probe and a local custom Resend sender on `dirtcatrecords.com`.
- The Stage 7 `v1-usability` sandbox run now passes locally end to end against the real Supabase, Google Drive, and Resend integrations plus sandbox-like PayPal payment events.
- Vercel production and preview PayPal env separation is now in place, including distinct preview and production webhook ids.
- The latest preview deployment is publicly reachable for PayPal sandbox webhook testing because Vercel Authentication was temporarily disabled at the project level.
- Preview browser validation now reaches sandbox PayPal from the deployed checkout flow.
- The remaining work is the last Stage 7 live-provider slice: complete one full sandbox payment plus webhook round-trip on preview, verify production magic-link behavior, verify Google Drive sharing and Resend deliverability, then restore preview protection and finish the launch checklist.

## VS Code Workflow

This repo now includes editor and CI surfaces that match the installed extension stack.

- `.vscode/settings.json` enables Prettier-on-save for the file types used in this repo and keeps GitHub PR / Actions focused on the `origin` remote.
- `.vscode/tasks.json` exposes `npm test`, `npm run check:js`, `npm run deploy:preflight`, and `npm run dev:vercel` through the VS Code task runner.
- `.vscode/extensions.json` recommends the workflow extensions used by this repo: Vercel, PayPal, Supabase, GitHub Pull Requests, GitHub Actions, GitLens, Thunder Client, and Prettier.
- `.github/workflows/ci.yml` runs the same deploy preflight in GitHub Actions that local pushes already run through Husky.

Recommended use inside VS Code:

1. Use the Vercel sidebar to pull envs, inspect preview deployments, and read deployment checks/logs.
2. Use the PayPal extension quick links to jump directly to sandbox accounts, webhook deliveries, API calls, and PayPal error logs while testing checkout.
3. Use the Supabase sidebar after a payment test to confirm database-side effects instead of relying only on browser success pages.
4. Use GitHub Pull Requests for review and branch-to-PR flow, and GitHub Actions to inspect CI runs and logs without leaving the editor.
5. Use GitLens to inspect file history and blame when a payment, docs, or deployment change needs provenance before editing.
6. Use Thunder Client for repeatable calls to local or preview routes like `/api/admin/setup-wizard`, `/api/cron/follow-ups`, and `/api/webhooks/paypal` when you want a GUI alternative to the documented `curl` commands.

Not every installed extension maps cleanly to this repo yet:

- Live Server is not the source of truth for runtime testing here because this project depends on Vercel Functions; use `npm run dev:vercel` instead.
- Tailwind CSS is currently not relevant because the repo does not use Tailwind.
- Docker and Dev Containers are not wired in because the repo has no Dockerfile or container workspace config.
- ESLint can still be useful personally, but this repo does not yet define an ESLint config, so the enforced code-quality gates remain Prettier, `npm run check:js`, `npm test`, and `npm run deploy:preflight`.
- Error Lens, Todo Tree, Console Ninja, and file-icon extensions are fine personal productivity tools, but they do not require repo-level integration.

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
- `api/portal/actions.js` handles authenticated portal project loads, file-link submissions, revision requests, final approvals, quote checkout starts, and balance checkout starts.
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

Deployment note: keep the variable names the same across environments, but use different values per environment. Preview should use sandbox credentials and webhook id, while production should use live credentials and webhook id.

Webhook note: `PAYPAL_WEBHOOK_ID` is environment-specific and must match the PayPal app and environment currently in use. A live webhook id will not validate sandbox webhook signatures, and a sandbox webhook id will not validate live webhook signatures.

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
- `GOOGLE_DRIVE_PROJECTS_FOLDER_ID`: raw parent Drive folder id for project folders, not the full `drive.google.com` folder URL.
- `GOOGLE_OAUTH_SCOPE`: defaults to `https://www.googleapis.com/auth/drive`.

Generate a refresh token with:

```bash
npm run google:refresh-token
```

### Resend

- `RESEND_API_KEY`: Resend API key.
- `RESEND_FROM_EMAIL`: verified sender, for example `Dirt Cat Records <studio@dirtcatrecords.com>`.
- `RESEND_REPLY_TO_EMAIL`: reply-to address. Falls back to `ADMIN_EMAIL` when omitted.

Safety caveat: `RESEND_FROM_EMAIL` must use a domain you control that is configured in Resend for both send and receive. Free inbox domains like `gmail.com` are not valid senders for this workflow.

### Optional Test Settings

- `TEST_BUSINESS_NAME`
- `TEST_CUSTOMER_EMAIL`
- `TEST_EMAIL_RECIPIENT`
- `TEST_SUBJECT_PREFIX`
- `TEST_DRIVE_FOLDER_PREFIX`

These are used by admin simulation/sandbox test runs.

### Stage 6 Follow-Up Cron

- `CRON_SECRET`: required token for protected follow-up cron route.

## Credential Todo List

Use this checklist any time you set up `.env.local`, update Vercel environment variables, or debug provider communication.

1. Copy `.env.example` to `.env.local` and fill every required value before testing runtime behavior.
2. Set `SITE_URL` to the real site origin for deployed environments and to `http://localhost:3000` when you need local runtime links.
3. Set `ADMIN_EMAIL` to the real owner/admin inbox that should access admin APIs.
4. Fill PayPal credentials from the PayPal developer dashboard:
   `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_WEBHOOK_ID`.
   Use sandbox values for Preview and live values for Production.
5. Fill Supabase credentials from the Supabase project settings:
   `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
6. Fill Google Drive automation credentials:
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_PROJECTS_FOLDER_ID`.
7. Fill Resend credentials:
   `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and optionally `RESEND_REPLY_TO_EMAIL`.
8. Set `TEST_CUSTOMER_EMAIL` and `TEST_EMAIL_RECIPIENT` to your own inbox while running sandbox/provider tests so test traffic stays contained.
9. Re-check `.env.local` and Vercel env vars against `.env.example` whenever a provider test fails unexpectedly.

## Google Drive Folder ID

`GOOGLE_DRIVE_PROJECTS_FOLDER_ID` must be the raw Google Drive folder id, not the full URL.

How to get it:

1. Open the parent projects folder in Google Drive.
2. Copy the browser URL.
3. Find the segment after `/folders/` and before `?` or the end of the URL.
4. Paste only that segment into `GOOGLE_DRIVE_PROJECTS_FOLDER_ID`.

Example:

```text
https://drive.google.com/drive/folders/1dOrK3U5gNqMjMdPDvH-Vgd1oMTtxGXar?usp=sharing
```

Correct value:

```text
1dOrK3U5gNqMjMdPDvH-Vgd1oMTtxGXar
```

Wrong value:

```text
https://drive.google.com/drive/folders/1dOrK3U5gNqMjMdPDvH-Vgd1oMTtxGXar?usp=sharing
```

If setup checks report `File not found`, the two most likely causes are:

1. The env var contains the full URL instead of the raw folder id.
2. The configured Google OAuth client/refresh token does not have access to that folder.

## Before Every Commit And Push

This is a required gate for this repo when runtime, provider, docs, or deployment behavior might be affected.

1. Compare `.env.local` and the target Vercel environment against `.env.example`.
2. Confirm `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` is the raw folder id only.
3. Start local runtime with `npx vercel dev`.
4. Run the admin setup check:

```bash
curl -sS "http://localhost:3000/api/admin/setup-wizard?action=setup"
```

5. If `storage` fails, do not commit or push as runtime-ready until the Drive config is fixed.
6. Run the narrowest relevant workflow checks, then at minimum run:

```bash
npm test
npm run check:js
git diff --check
```

7. `git push` is guarded by Husky `pre-push`, which runs:

```bash
npm run deploy:preflight
```

8. If Husky blocks the push, fix the reported issue locally and rerun the push only after the preflight is green.

## Local Checks

```bash
npm test
npm run check:js
```

## Deployment Preflight

This repo is designed to stay within the Vercel Hobby limit of 12 Serverless Functions.

`git push` already runs this automatically through `.husky/pre-push`, and you can still run it manually before a production deploy:

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

Stage 7 note: the admin setup check now performs a live Google Drive access probe for `GOOGLE_DRIVE_PROJECTS_FOLDER_ID`. If storage fails with `File not found`, verify that the value is the raw folder id and that the OAuth client can access that folder.

Current verification state:

- Local setup checks pass with the custom `dirtcatrecords.com` Resend sender.
- Local `v1-usability` sandbox run passed with `testRunId=sandbox-20260519T113900-stage7c` and cleanup also passed.
- Vercel production env parity is now present for the documented runtime requirements.
- Preview env coverage is still incomplete and is missing at least `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, PayPal vars, and likely should use `PAYPAL_ENV=sandbox` for safe preview testing.
- Production-safe runtime smoke now passes on `https://www.dirtcatrecords.com`: `portal.html` and `admin.html` return `200`, `GET /api/checkout-config` returns valid public config JSON, and `GET /api/admin/setup-wizard?action=setup` returns `401` without admin auth as expected.

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
