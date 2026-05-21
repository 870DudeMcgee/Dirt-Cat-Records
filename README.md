# Dirt Cat Records

Dirt Cat Records is a V1 launch-candidate studio operations site for taking paid mix/mastering work from checkout through final approval.

The repo contains the public marketing site, PayPal checkout, customer portal, paid-customer support flow, private owner admin dashboard, and the serverless automation that ties PayPal, Supabase, Google Drive, and Resend together.

## What It Does

- Presents Dirt Cat Records services and the free mix-review intake.
- Creates Checkout Payments through PayPal and turns paid work into tracked Projects.
- Gives customers a portal for upload links, revision requests, Quote acceptance, Balance Payments, and Final Delivery approval.
- Gives the owner an admin dashboard for project status, quotes, final delivery, notes, setup checks, sandbox proof runs, and cleanup tools.
- Automates Google Drive project folders, transactional email, payment-state transitions, Delivery Lock behavior, and stale-project follow-ups.
- Stays deployable on the Vercel Hobby plan by keeping the API surface within the 12-function limit.

## Current Status

The current web app is in V1 launch-candidate state. Stages 0 through 6 are implemented, Stage 7 launch hardening has passed local preflight, and owner manual testing has passed for the website, checkout, portal, support, and provider workflow.

The remaining launch work is operational discipline: keep V1 behavior frozen unless a real blocker appears, deploy production only from committed and pushed code, confirm preview protection after webhook testing, and monitor the first real customer workflow across PayPal, Supabase, Google Drive, Resend, the portal, and admin.

For exact current state and next action, read [docs/agent-handoff.md](docs/agent-handoff.md). For the staged checklist, read [docs/roadmap.md](docs/roadmap.md).

## Tech Stack

- Static HTML, CSS, and browser JavaScript for the public pages, checkout, portal, support, and admin UI.
- Vercel Functions under `api/` for checkout, portal actions, admin APIs, cron, and PayPal webhooks.
- Supabase for customer auth and studio records.
- PayPal for Checkout Payments, Quote Payments, Balance Payments, and webhook confirmation.
- Google Drive for project folder creation and sharing.
- Resend for transactional studio email.
- Node's built-in test runner plus syntax and deployment preflight scripts.

## Repo Map

- `index.html`, `checkout.html`, `success.html`, `portal.html`, `support.html`, `admin.html`: primary browser surfaces.
- `style.css`, `nav.js`, `spells.js`, `checkout.js`, `success.js`, `portal.js`, `portal-view.js`, `support.js`, `admin.js`: shared styling and page behavior.
- `api/`: Vercel Functions for public, portal, admin, cron, and webhook routes.
- `lib/`: PayPal, Supabase, Google Drive, Resend, auth, portal policy, checkout pricing, and automation modules.
- `supabase/schema.sql`: database schema and service-role model.
- `test/`: automated coverage for checkout, portal, admin, automation, PayPal, Supabase, and page behavior.
- `docs/`: operator workflow, roadmap, handoff, deployment, architecture, execution history, and planning docs.

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

`deploy:preflight` checks the Vercel function count, the full test suite, JavaScript syntax, and diff whitespace.

## Documentation

Use the smallest doc that owns the fact you need.

- [docs/operator-guide.md](docs/operator-guide.md): detailed setup, environment, runtime, credential, launch, and owner-proof instructions.
- [docs/workflow.md](docs/workflow.md): branch discipline, preview classes, alias rules, and deployment provenance.
- [docs/deployment-preflight.md](docs/deployment-preflight.md): Vercel Hobby function-limit guardrail and deployment triage.
- [docs/roadmap.md](docs/roadmap.md): staged checklist and active launch-hardening status.
- [docs/agent-handoff.md](docs/agent-handoff.md): current repo state and next-session guidance.
- [docs/execution-trail.md](docs/execution-trail.md): required implementation logging process.
- [docs/execution-log.md](docs/execution-log.md): append-only history and validation evidence.
- [CONTEXT.md](CONTEXT.md): canonical domain language for Project, Quote, Checkout Payment, Quote Payment, Balance Payment, Delivery Lock, Final Delivery, and Portal Action.
- [docs/adr/](docs/adr): accepted architectural decisions.

## Safety Notes

- Never commit real secrets. Start from `.env.example` and keep live values in local ignored env files and Vercel environment variables.
- Preview and development should use PayPal sandbox credentials; production should use PayPal live credentials.
- `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` must be the raw folder id, not a full Google Drive URL.
- Treat the app as operating at the Vercel Hobby function cap unless a fresh function-count check proves otherwise.
- Shared preview and production deployments must come from committed and pushed code and be recorded in [docs/deployment-ledger.md](docs/deployment-ledger.md).
