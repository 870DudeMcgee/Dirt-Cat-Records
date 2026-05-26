# Dirt Cat Records

Dirt Cat Records is a web app for selling and managing mix/mastering services. It supports public service pages, PayPal checkout, customer project portals, owner admin tools, file delivery, revision handling, and automated email/payment workflows.

## Status

V1 launch candidate. Core checkout, portal, admin, payment, email, Google Drive automation, support, and follow-up flows are implemented. Remaining work is primarily production launch discipline, production deployment, and final owner verification.

See [docs/agent-handoff.md](docs/agent-handoff.md) for the current next action and [docs/roadmap.md](docs/roadmap.md) for the staged launch checklist.

> This repo controls live studio operations. Run the deployment preflight and follow the deployment ledger process before shared preview or production changes.

## Features

### Customer-facing

- Public service pages and free mix-review intake.
- PayPal checkout for direct paid services.
- Post-payment success flow with portal and support next steps.
- Customer portal access through Supabase magic links.
- Portal actions for file links, revision requests, Quote acceptance, Balance Payments, and Final Delivery approval.
- Dedicated paid-customer support form.

### Owner/admin

- Private admin dashboard for studio operations.
- Project queue, project detail, status updates, admin notes, final delivery controls, and extra revision actions.
- Quote creation and send workflow for custom work and free-review conversions.
- Setup checks, sandbox proof runs, owner-proof preview cards, and cleanup tools.

### Automation and Integrations

- PayPal order creation, capture handling, and webhook confirmation.
- Supabase-backed customer auth and studio records.
- Google Drive project folder creation and upload-folder sharing.
- Resend transactional email for intake, upload instructions, quotes, delivery, support, and follow-ups.
- Delivery Lock behavior for Projects with outstanding balances.
- Protected follow-up cron for stale missing-file, pending-quote, balance-due, and final-approval states.
- Vercel Hobby function-limit guardrails to keep the API surface deployable.

## Tech Stack

- Static HTML, CSS, and browser JavaScript for the public pages, checkout, portal, support, and admin UI.
- Vercel Functions under `api/` for checkout, portal actions, admin APIs, cron, and PayPal webhooks.
- Supabase for customer auth and studio records.
- PayPal for Checkout Payments, Quote Payments, Balance Payments, and webhook confirmation.
- Google Drive for project folder creation and sharing.
- Resend for transactional studio email.
- Node's built-in test runner plus syntax and deployment preflight scripts.

## Architecture Overview

```text
Customer
  -> Public site, checkout, portal, or support page
  -> Vercel Functions
       -> Supabase records and auth
       -> PayPal orders, captures, and webhooks
       -> Google Drive project folders
       -> Resend transactional email

Owner
  -> Admin dashboard
  -> Vercel Functions
       -> Supabase records
       -> PayPal payment state
       -> Google Drive delivery folders
       -> Resend transactional email
```

The central domain objects are Projects, Quotes, Checkout Payments, Quote Payments, Balance Payments, Delivery Lock, Final Delivery, and Portal Actions. The canonical language lives in [CONTEXT.md](CONTEXT.md).

## Prerequisites

- Node.js 18+ or a current Node LTS release. The repo does not currently pin an exact Node version.
- npm.
- Vercel account and project access. The documented CLI path uses `npx vercel`, so a global Vercel install is optional.
- Supabase project with the schema from [supabase/schema.sql](supabase/schema.sql).
- PayPal REST app credentials and webhook IDs for sandbox/preview and live/production.
- Google Cloud OAuth credentials with Drive API access and a refresh token.
- Resend API key and a verified sender domain.

## Quick Start

Install dependencies:

```bash
npm install
```

Initialize local env profiles, then fill the generated files from `.env.example`:

```bash
npm run env:init:preview
npm run env:init:production
```

Activate the profile you want to run locally:

```bash
npm run env:use:preview
```

Start the Vercel local runtime:

```bash
npm run dev:vercel
```

Use Vercel's local runtime instead of a static file server because checkout, portal, admin, cron, and webhook flows depend on Vercel Functions.

## Environment Profiles

Start from `.env.example`. Real secrets belong only in ignored local env files and Vercel environment variables.

- `.env.local.preview`: local preview-style secrets, typically PayPal sandbox values.
- `.env.local.production`: local production-style secrets, typically PayPal live values.
- `.env.local`: active runtime file loaded by the app.

Use `npm run env:use:preview` or `npm run env:use:production` to copy one stored profile into `.env.local`, then restart the local runtime so the app reads the active profile.

The full credential checklist lives in [docs/operator-guide.md](docs/operator-guide.md).

## Common Commands

| Command                            | Purpose                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `npm install`                      | Install dependencies.                                                   |
| `npm run dev:vercel`               | Start the Vercel local runtime.                                         |
| `npm run dev:stack`                | Start local Supabase, then Vercel dev runtime.                          |
| `npm run env:status`               | Show the current local env profile state.                               |
| `npm run env:use:preview`          | Activate the preview-style local env profile.                           |
| `npm run env:use:production`       | Activate the production-style local env profile.                        |
| `npm test`                         | Run automated tests.                                                    |
| `npm run check:js`                 | Check JavaScript syntax across browser, API, library, and script files. |
| `npm run deploy:preflight`         | Run the full deployment gate.                                           |
| `npm run google:refresh-token`     | Generate a Google OAuth refresh token for Drive automation.             |
| `npm run record:deployment -- ...` | Record shared preview or production deployment provenance.              |

## Verification

Run the normal local checks:

```bash
npm test
npm run check:js
```

Run the deployment gate before any shared preview or production release:

```bash
npm run deploy:preflight
```

`deploy:preflight` checks the Vercel function count, the full test suite, JavaScript syntax, and diff whitespace. The same gate runs through Husky before push.

## Deployment

The app is designed for Vercel. Shared preview and production deployments should come only from committed and pushed code.

Before a shared preview or production release:

1. Confirm the worktree contains only intentional release changes.
2. Run `npm run deploy:preflight`.
3. Deploy from a pushed commit.
4. Record the deployment in [docs/deployment-ledger.md](docs/deployment-ledger.md).
5. Follow the preview alias and retest rules in [docs/workflow.md](docs/workflow.md).

The app is currently designed to stay within the Vercel Hobby limit of 12 Serverless Functions. Treat the repo as operating at that cap unless a fresh function-count check proves otherwise.

## Repo Map

- `index.html`, `checkout.html`, `success.html`, `portal.html`, `support.html`, `admin.html`: primary browser surfaces.
- `style.css`, `nav.js`, `spells.js`, `checkout.js`, `success.js`, `portal.js`, `portal-view.js`, `support.js`, `admin.js`: shared styling and page behavior.
- `api/`: Vercel Functions for public, portal, admin, cron, and webhook routes.
- `lib/`: PayPal, Supabase, Google Drive, Resend, auth, portal policy, checkout pricing, and automation modules.
- `supabase/schema.sql`: database schema and service-role model.
- `test/`: automated coverage for checkout, portal, admin, automation, PayPal, Supabase, and page behavior.
- `docs/`: operator workflow, roadmap, handoff, deployment, architecture, execution history, and planning docs.

## Documentation

Use the smallest doc that owns the fact you need.

### Start here

- [docs/operator-guide.md](docs/operator-guide.md): detailed setup, environment, runtime, credential, launch, and owner-proof instructions.
- [docs/agent-handoff.md](docs/agent-handoff.md): current repo state and next-session guidance.
- [docs/roadmap.md](docs/roadmap.md): staged checklist and active launch-hardening status.

### Launch and Deployment

- [docs/workflow.md](docs/workflow.md): branch discipline, preview classes, alias rules, and deployment provenance.
- [docs/deployment-preflight.md](docs/deployment-preflight.md): Vercel Hobby function-limit guardrail and deployment triage.
- [docs/deployment-ledger.md](docs/deployment-ledger.md): append-only shared preview and production deployment records.

### Planning and History

- [docs/execution-trail.md](docs/execution-trail.md): required implementation logging process.
- [docs/execution-log.md](docs/execution-log.md): append-only history and validation evidence.
- [docs/superpowers/](docs/superpowers): plans, specs, and future-product exploration.
- [docs/superpowers/specs/2026-05-26-drum-alignment-workbench-v1-design.md](docs/superpowers/specs/2026-05-26-drum-alignment-workbench-v1-design.md): approved Drum Alignment Workbench V1 design.
- [docs/superpowers/plans/2026-05-26-drum-alignment-workbench-v1-implementation.md](docs/superpowers/plans/2026-05-26-drum-alignment-workbench-v1-implementation.md): parallel-agent implementation plan for the Drum Alignment Workbench.

### Architecture

- [CONTEXT.md](CONTEXT.md): canonical domain language.
- [docs/adr/](docs/adr): accepted architectural decisions.

## Safety Notes

- Never commit real secrets. Start from `.env.example` and keep live values in local ignored env files and Vercel environment variables.
- Preview and development should use PayPal sandbox credentials; production should use PayPal live credentials.
- `PAYPAL_WEBHOOK_ID` is environment-specific and must match the PayPal app and environment currently in use.
- `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` must be the raw folder id, not a full Google Drive URL.
- `RESEND_FROM_EMAIL` must use a verified sender domain, not a public inbox domain.
- Shared preview aliases and production deployments must be tied to pushed commits and recorded in [docs/deployment-ledger.md](docs/deployment-ledger.md).
