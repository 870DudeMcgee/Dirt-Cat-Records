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
Use [`docs/workflow.md`](docs/workflow.md) and [`docs/deployment-ledger.md`](docs/deployment-ledger.md) before any shared preview or production retest, and use the remaining workflow hardening tasks in [`docs/superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md`](docs/superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md) for the follow-on cleanup.
The ordered follow-on plan for the PayPal environment and webhook seams lives in [`docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`](docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md).
The ordered follow-on plan for workflow deepening after the PayPal seam work lives in [`docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`](docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md).
The durable architecture gap register lives in [`docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`](docs/superpowers/specs/2026-05-20-architecture-readiness-review.md).

## Temporary Workflow Freeze

While the remaining workflow hardening tasks are still open, treat these rules as mandatory:

- shared preview alias must point only at a deployment from a pushed commit;
- dirty local Vercel deploys are diagnostic only and must not be used as the team-facing preview target;
- production deploys must come only from committed and pushed code.

## Branch And Worktree Discipline

Use `main` as the integration and release branch, not the scratch workspace.

- active implementation belongs on `wip/<topic>` or `fix/<topic>`;
- use a git worktree when task isolation matters or when `main` needs to stay clean for comparison and release checks;
- if `main` is dirty, treat that as recovery work before continuing normal implementation.

The standard start-work flow lives in [`docs/workflow.md`](docs/workflow.md).

## Deployment Provenance

Shared preview and production deployments must be tied to a pushed commit and recorded in [`docs/deployment-ledger.md`](docs/deployment-ledger.md).

Use:

```bash
npm run record:deployment -- --env preview --url <deployment-url> --alias <alias-or-none> --purpose <test-purpose> --verifier <name>
```

If a deployment matters only for personal debugging, keep it diagnostic-only and do not repoint the shared preview alias to it.

## Preview Classes

- diagnostic preview: ad hoc validation surface, including local CLI-driven deploys; useful for debugging, not trustworthy for shared sign-off;
- shared preview: team-facing preview deployment tied to a pushed SHA, recorded in [`docs/deployment-ledger.md`](docs/deployment-ledger.md), and eligible for the stable preview alias.

Before any external retest, confirm the shared preview deployment URL, the stable preview alias target, and the pushed SHA for that deployment.

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
- The repo currently passes `npm run deploy:preflight`; if branch/worktree state matters, trust `git status -sb` and `git log` over status prose in repo docs.
- The V1 owner-proof sandbox harness is implemented and documented.
- Deploy guardrails are active: portal payment starts were consolidated into `api/portal/actions.js`, the repo stays under the 12-function Hobby limit, and `.husky/pre-push` runs `npm run deploy:preflight` before push.
- The deployment seam has no casual headroom: treat the repo as operating at the Vercel Hobby function cap unless a fresh function-count check proves otherwise.
- The repo now includes workspace-level VS Code settings, reusable tasks, and extension recommendations for the Vercel, PayPal, Supabase, GitHub PR, GitHub Actions, and Prettier workflow.
- The workspace recommendations now also include GitLens for repo-history inspection and Thunder Client for repeatable local/preview API checks.
- The repo now includes an environment parity audit for `.env.local` and pulled Vercel env files so provider setup drift can be checked without printing secrets.
- The repo now includes local env profile helpers so preview-style and production-style secrets can coexist locally without changing the runtime filename that the app loads.
- The setup wizard readiness report, the public `/api/checkout-config` response, and the local env parity audit now all expose the same safe runtime fingerprint so deployed preview and local preview profiles can be compared without revealing secret values.
- The PayPal capture route now restores checkout metadata from either the pre-capture order read or the capture response, which covers sandbox responses where the initial order read omits `custom_id`.
- GitHub Actions now runs the same `npm run deploy:preflight` guardrail on `push` to `main` and on pull requests.
- The local credential sanity gate now passes with the live Google Drive probe and a local custom Resend sender on `dirtcatrecords.com`.
- The Stage 7 `v1-usability` sandbox run now passes locally end to end against the real Supabase, Google Drive, and Resend integrations plus sandbox-like PayPal payment events.
- Vercel production and preview PayPal env separation is now in place, including distinct preview and production webhook ids.
- PayPal readiness now enforces the code-backed runtime lifecycle invariant: production expects PayPal `live`, while preview and development expect PayPal `sandbox`.
- The current preview deployment used for webhook testing must be confirmed from Vercel before use; do not treat older docs as the source of truth for preview URLs.
- The PayPal sandbox webhook currently lands on a stable preview alias, so that alias must be repointed to the same deployment used for browser checkout before interpreting webhook results.
- The preview webhook parser now accepts the PayPal events the sandbox flow actually emits: `CHECKOUT.ORDER.APPROVED` and `PAYMENT.CAPTURE.COMPLETED`, including capture payloads that omit buyer email and require a related-order lookup.
- Preview browser validation now reaches sandbox PayPal from the deployed checkout flow and reaches `success.html` on the active diagnostic deployment.
- The portal magic-link UI now prevents duplicate sends in the same tab and applies a one-minute resend cooldown with a clearer message when Supabase OTP throttling is hit.
- Customer portal actions now keep confirmation visible after login, including revision-request success, file-link success, quote/balance checkout starts, and final approval feedback.
- Friends free-code checkout projects now carry unlimited revision access into the customer portal, and paid projects show a compact upsell panel for extra revisions, new checkout work, and custom add-ons.
- Shared form styling now keeps checkout, portal, and support inputs/buttons contained inside their glass panels, including add-on quantity fields, discount-code rows, and the support page's field/action layout.
- Paid customers now have a dedicated `support.html` support flow backed by `api/public/project-support.js`, so the success page no longer routes them into the homepage or free-review funnel when they need help.
- Historical `vercel.app` URLs still present in append-only logs and older plan docs are historical records, not active runtime configuration.
- A single preview deployment on 2026-05-20 failed after `vercel build` completed, but the immediately following preview deployment reached `Ready`; treat that one failure as transient unless the same deployment-stage error starts repeating.
- The repo now has a dedicated workflow hardening plan focused on the bigger failure mode behind recent debugging waste: shared environments and docs can drift away from a known pushed commit unless provenance is treated as a first-class workflow artifact.
- Shared preview provenance now has a durable home in `docs/deployment-ledger.md`, and retests should use the ledgered shared preview rather than ad hoc diagnostic deployment URLs.
- The ordered PayPal environment deepening plan is now implemented through runtime-aware payment-purpose routing, and the broader deep-module slices are in place: Project payment transitions now live behind `lib/automation/project-payment-transition.js`, Project event meaning now lives behind `lib/automation/project-event-schema.js`, Quote state transitions now live behind `lib/automation/quote-lifecycle.js`, Portal Action eligibility now lives behind `lib/portal/action-policy.js`, follow-up pipeline orchestration now lives behind `lib/automation/follow-up-orchestrator.js`, and email sequence choreography now lives behind `lib/email/email-sequence-choreographer.js`.
- The real sandbox webhook and automation round-trip is now proven on preview: live sandbox checkout creates preview `orders`, `payments`, `projects`, `project_events`, and `email_events`, and the latest verification run also confirmed Google Drive folder creation plus writer access for the preview override account.

## Documentation Map

Use the smallest source-of-truth doc that actually owns the fact you need.

- `README.md`: operator workflow, setup requirements, runtime commands, and high-level current state.
- `docs/workflow.md`: branch roles, start-work flow, preview classes, alias rules, and deployment provenance workflow.
- `docs/roadmap.md`: staged checklist source of truth and active delivery slice.
- `docs/agent-handoff.md`: current repo state and exact next action for the next worker.
- `docs/execution-log.md`: append-only implementation history and validation evidence.
- `docs/deployment-ledger.md`: append-only shared preview and production deployment provenance.
- `docs/superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md`: ordered workflow/version-control plan for branch discipline, deployment provenance, alias rules, and doc ownership.
- `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`: ordered PayPal deepening work after the Stage 7 webhook truth gap is closed.
- `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`: ordered deep-module follow-on for Project payment transitions, Project events, Quote lifecycle, Portal Action policy, follow-up orchestration, and email sequence choreography.
- `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`: durable architecture gap register and anti-drift rules.
- `CONTEXT.md` and `docs/adr/`: domain language and accepted architectural decisions.

Anti-drift rule:

- Verify live preview URLs, worktree cleanliness, and the latest pushed commit from Vercel and git, not from frozen prose copied across multiple docs.
- Until the workflow hardening plan is complete, do not let the shared preview alias or production point at a dirty-worktree deployment.

## VS Code Workflow

This repo now includes editor and CI surfaces that match the installed extension stack.

- `.vscode/settings.json` enables Prettier-on-save for the file types used in this repo and keeps GitHub PR / Actions focused on the `origin` remote.
- `.vscode/tasks.json` exposes `npm test`, `npm run check:env`, `npm run check:js`, `npm run deploy:preflight`, and `npm run dev:vercel` through the VS Code task runner.
- `.vscode/extensions.json` recommends the workflow extensions used by this repo: Vercel, PayPal, Supabase, GitHub Pull Requests, GitHub Actions, GitLens, Thunder Client, and Prettier.
- `.github/workflows/ci.yml` runs the same deploy preflight in GitHub Actions that local pushes already run through Husky.

CLI strategy for this repo:

- `supabase` and `vercel` do not need global installs here. The repo-standard path is `npx supabase ...` and `npx vercel ...` so local scripts and docs stay consistent across machines.
- Global installs are fine as a personal convenience, but they are not the documented requirement for this repo.
- `npm run dev:stack` exists as a package-level convenience command when you want local Supabase startup followed by `npm run dev:vercel`, but it is not currently exposed as a VS Code task.
- `npm run env:init:preview`, `npm run env:init:production`, `npm run env:use:preview`, `npm run env:use:production`, and `npm run env:status` manage local env profiles while keeping `.env.local` as the only runtime-active filename.

Recommended use inside VS Code:

1. Use the Vercel sidebar to pull envs, inspect preview deployments, and read deployment checks/logs.
2. Use the PayPal extension quick links to jump directly to sandbox accounts, webhook deliveries, API calls, and PayPal error logs while testing checkout.
3. Use the Supabase sidebar after a payment test to confirm database-side effects instead of relying only on browser success pages.
4. Use GitHub Pull Requests for review and branch-to-PR flow, and GitHub Actions to inspect CI runs and logs without leaving the editor.
5. Use GitLens to inspect file history and blame when a payment, docs, or deployment change needs provenance before editing.
6. Use Thunder Client for repeatable calls to local or preview routes like `/api/admin/setup-wizard`, `/api/cron/follow-ups`, and `/api/webhooks/paypal` when you want a GUI alternative to the documented `curl` commands.
7. When preview behavior disagrees with local assumptions, compare `GET /api/checkout-config` on both the active diagnostic deployment and the stable preview alias against `npm run check:env:preview`; use `GET /api/admin/setup-wizard?action=setup` when you already have admin auth and want the same fingerprint alongside readiness sections.

Extension attachment checklist:

1. Vercel: confirm the sidebar loads the linked `dirt-cat-records` project from `.vercel/project.json`, then verify env pull and deployment log access.
2. Supabase: connect both the hosted project and the local stack from `supabase/config.toml`, then inspect auth, tables, and storage after a local or preview test.
3. GitHub Pull Requests and GitHub Actions: confirm both sidebars detect the `origin` remote configured in `.vscode/settings.json` and can load repo data.
4. Docker: confirm the extension shows the running `supabase_*_DirtCatRecords` containers. Docker is used here for the Supabase stack, not as the app runtime.

Not every installed extension maps cleanly to this repo yet:

- Live Server is not the source of truth for runtime testing here because this project depends on Vercel Functions; use `npm run dev:vercel` instead.
- Tailwind CSS is currently not relevant because the repo does not use Tailwind.
- Docker and Dev Containers are not wired in because the repo has no Dockerfile or container workspace config.
- Docker is still useful as a visibility surface for the local Supabase services, but not as the source of truth for app startup or deployment behavior.
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
- `success.html` and `success.js` show the post-payment order summary and portal/support next steps.
- `support.html` and `support.js` provide a paid-customer project support form that pre-fills recent checkout or portal upsell context when available.
- `portal.html`, `portal.js`, and `portal-view.js` provide Supabase magic-link customer access, visible action confirmations, unlimited free-code revision display, quote cards, quote checkout, balance payment start actions, and paid-project upsell links.
- `lib/portal/action-policy.js` owns Portal Action eligibility, visibility, denial reasons, and payment amount decisions shared by browser visibility rules and server-side authority checks.
- `admin.html` and `admin.js` provide the owner operations dashboard, priority queue, project detail with status updates, private admin notes, final delivery controls, and extra revision actions, plus setup checks, sandbox test runs, and cleanup tools.
- `api/admin/quotes.js` provides protected admin quote draft and send actions.
- `lib/automation/quote-lifecycle.js` owns Quote creation, send, view, checkout eligibility, amount-due, and accepted-state transition decisions for admin, portal, and payment confirmation callers.
- `api/public/project-support.js` handles paid-customer support requests from the dedicated project support page.
- `api/portal/actions.js` handles authenticated portal project loads, file-link submissions, revision requests, final approvals, quote checkout starts, and balance checkout starts.
- `api/` contains Vercel Functions.
- `lib/automation/follow-up-orchestrator.js` owns follow-up candidate selection, queue intent normalization, enqueue outcome classification, and the cron run pipeline while keeping Supabase persistence and email dispatch as Adapters.
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

### Free Checkout Code

- `FRIENDS_FREE_CHECKOUT_CODE`: server-side code that makes direct checkout free for trusted friends. Leave blank to disable the no-charge path.

Safety caveat: `FRIENDS_FREE_CHECKOUT_CODE` must never be returned from client-visible config or committed with a real value. Store the real code only in local or Vercel environment variables.

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
- `GOOGLE_DRIVE_TEST_SHARE_EMAIL`: optional preview/sandbox-only override for Drive sharing when the PayPal sandbox buyer email is not a real Google account.
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

1. Initialize untracked local profiles once with `npm run env:init:preview` and `npm run env:init:production`.
2. Fill `.env.local.preview` with preview-style local values and `.env.local.production` with production-style local values.
3. Activate the profile you want to run with by copying it into `.env.local`:
   `npm run env:use:preview` or `npm run env:use:production`.
4. Set `SITE_URL` in the active profile to `http://localhost:3000` when you need local runtime links, even if the rest of the profile uses preview or production provider values.
5. Set `ADMIN_EMAIL` to the real owner/admin inbox that should access admin APIs.
6. Fill PayPal credentials from the PayPal developer dashboard:
   `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_WEBHOOK_ID`.
   Use sandbox values in `.env.local.preview` and live values in `.env.local.production`.
7. Optionally set `FRIENDS_FREE_CHECKOUT_CODE` in local or Vercel env vars to enable no-charge direct checkout for trusted friends.
8. Fill Supabase credentials from the Supabase project settings:
   `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
9. Fill Google Drive automation credentials:
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_PROJECTS_FOLDER_ID`.
10. Fill Resend credentials:
    `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and optionally `RESEND_REPLY_TO_EMAIL`.
11. Set `TEST_CUSTOMER_EMAIL` and `TEST_EMAIL_RECIPIENT` to your own inbox while running sandbox/provider tests so test traffic stays contained.
12. Re-check the active `.env.local` and the target Vercel env vars against `.env.example` whenever a provider test fails unexpectedly.

## Local Env Profiles

Local runtime still loads only `.env.local`. The profile helpers do not change that seam. They only copy one stored local profile into `.env.local` so the rest of the app keeps working unchanged.

Stored local profiles:

- `.env.local.preview`: preview-style local secrets, typically sandbox PayPal values.
- `.env.local.production`: production-style local secrets, typically live PayPal values.
- `.env.local`: the active runtime file loaded by the app.

These files are already ignored by the repo's `.env.*` ignore rule.

Recommended workflow:

```bash
npm run env:init:preview
npm run env:init:production
```

Fill both profile files once, then switch the active local env as needed:

```bash
npm run env:use:preview
npm run env:use:production
npm run env:status
```

Why this does not break runtime behavior:

- `lib/env/runtime.js` still loads `.env.local`.
- `scripts/google-refresh-token.js` still writes to `.env.local`.
- existing commands like `npm run check:env` still target `.env.local`.
- only the helper script changes which stored profile is copied into that active filename.

Safety rule:

- After switching profiles, restart `npm run dev:vercel` or any other local runtime process so it reads the newly activated `.env.local` values.

## Environment Parity Audit

Use the automated key-presence audit before assuming an extension or provider is broken.

Local:

```bash
npm run check:env
```

Active local preview-style profile:

```bash
npm run check:env:preview
```

Active local production-style profile:

```bash
npm run check:env:production
```

Preview:

```bash
rm -f /tmp/dcr-preview.env
npx vercel env pull /tmp/dcr-preview.env --environment=preview --yes
node scripts/check-env-parity.js /tmp/dcr-preview.env --profile preview
```

Production:

```bash
rm -f /tmp/dcr-production.env
npx vercel env pull /tmp/dcr-production.env --environment=production --yes
node scripts/check-env-parity.js /tmp/dcr-production.env --profile production
```

What this audit checks:

- required key presence against `.env.example`
- profile-specific PayPal environment expectations (`sandbox` for preview, `live` for production)
- local `SITE_URL` sanity for localhost workflows

Important caveat:

- On this machine, `npx vercel env pull` can preserve the expected key names while still writing empty placeholder values into the pulled file. Use pulled files for key-presence/profile audits, not as proof that deployed secret values are populated.

What it intentionally does not do:

- print secret values
- compare secret contents across environments
- replace the setup-wizard or provider-specific runtime tests
- prove that Vercel-hosted secrets are populated when a pulled env file contains empty placeholders

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
3. Configure Supabase email auth and allowed redirect URLs for `SITE_URL`, `/portal.html`, and `/admin.html`. Hosted Supabase URL Configuration must use fully qualified URLs including the scheme; `www.dirtcatrecords.com` without `https://` produces `requested_path_is_invalid` on confirmation links.
4. Configure PayPal webhook delivery to `/api/webhooks/paypal`.
5. Verify Resend sender domain and reply-to address.
6. Generate and store the Google refresh token.
7. Open `/admin.html`, sign in as `ADMIN_EMAIL`, and run setup checks.
8. Run simulation mode.
9. Run sandbox mode before taking real customer payments.
10. Run `npm test` and `npm run check:js` before every deploy.

Stage 7 note: the admin setup check now performs a live Google Drive access probe for `GOOGLE_DRIVE_PROJECTS_FOLDER_ID`. If storage fails with `File not found`, verify that the value is the raw folder id and that the OAuth client can access that folder.

Sandbox verification note: PayPal sandbox buyer emails use `@personal.example.com`, so they cannot accept Google Drive folder sharing. To verify the Drive-sharing step on preview without changing production behavior, set `GOOGLE_DRIVE_TEST_SHARE_EMAIL` in preview/local sandbox environments to a real Google account you control. The override is ignored when `PAYPAL_ENV=live`.

Latest preview verification note: with `GOOGLE_DRIVE_TEST_SHARE_EMAIL` set on preview, the latest paid sandbox checkout created Drive folders successfully and the upload folder granted `writer` access to `870skitzofrenzy@gmail.com`.

Current verification state:

- Local setup checks pass with the custom `dirtcatrecords.com` Resend sender.
- Customer portal login no longer relies on browser-side Supabase signup creation: `/api/portal/auth` now provisions a confirmed auth user for known customer emails first, and `portal.js` requests the magic link with `shouldCreateUser: false`.
- The hosted Supabase Auth URL Configuration is still an external dependency: generated signup links currently fall back to `redirect_to=www.dirtcatrecords.com`, so the hosted `Site URL` must be corrected to `https://www.dirtcatrecords.com` before considering confirmation-link flows fixed end to end.
- The portal auth preparation logic was folded into `api/portal/actions.js?action=auth` instead of a new standalone function so preview deployments stay under the Vercel Hobby 12-function cap.
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
