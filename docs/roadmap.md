# Dirt Cat Records Roadmap

This document tracks the staged work needed to turn the current site, checkout, portal, and automation foundation into a reliable studio operations system.

For current handoff context, see [`docs/agent-handoff.md`](agent-handoff.md).
For architecture language and decisions, see [`CONTEXT.md`](../CONTEXT.md) and [`docs/adr/`](adr).

Current next focus: Stage 7 launch hardening through real-provider validation and launch-checklist completion.

Current Stage 7 state: the local credential sanity gate passes again, the `v1-usability` Stage 7 sandbox run now passes end to end locally against the real Supabase, Google Drive, and Resend integrations plus sandbox-like PayPal payment events, production runtime smoke is healthy on the canonical `www` host, and preview now has the correct sandbox PayPal environment split. The latest preview deployment is public enough for webhook testing and its deployed checkout flow now reaches sandbox PayPal. The remaining work is the narrower launch-hardening slice: complete one end-to-end sandbox payment plus webhook round-trip on preview, verify production-domain magic-link behavior, verify Drive sharing and Resend deliverability, then restore preview protection and close the launch checklist.

Permanent workflow constraint: before every commit/push meant to be runtime-ready, run the credential sanity gate from `README.md` and `docs/execution-trail.md`, including the raw Google Drive folder id check.

## Execution Rule

For every implementation step in any stage:

1. Run a context check against plan docs and the live codebase.
2. Log what will be done in `docs/execution-log.md`.
3. Implement one bounded step.
4. Re-check codebase state and validations.
5. Log what was done and what remains.

Process details: [`docs/execution-trail.md`](execution-trail.md).

## Stage 0: Stabilize The Source Of Truth

Goal: make the repo clean, understandable, and hard to misuse.

- [x] Expand setup documentation in `README.md`.
- [x] Expand `.env.example` so it matches the app's real runtime requirements.
- [x] Expand `.gitignore` for local, OS, and dependency noise.
- [x] Decide how to handle the large audio assets currently committed under `assets/`: keep the current WAV files for now, then replace the site previews with MP3 versions later.
- [ ] Confirm a fresh clone can be configured from docs.
- [x] Run `npm test`.
- [x] Run `npm run check:js`.

## Stage 1: Replace The Manual Paid Intake Flow

Goal: after payment, customers should follow the automated portal/email workflow instead of a `mailto:` intake form.

- [x] Update `success.html` to confirm payment and point users to portal/email instructions.
- [x] Update `success.js` to show the paid order summary without implying manual intake is the primary workflow.
- [x] Keep webhook-created projects, Drive folders, and upload-instruction emails as the source of truth.
- [x] Add or update tests for the paid success flow where practical.

## Stage 2: Make The Customer Portal Feel Real

Goal: customers should see clear next steps and only the actions that apply to the current project state.

- [x] Add status labels and next-step copy.
- [x] Hide final approval until final delivery is ready.
- [x] Show revision availability and used/included revision counts.
- [x] Show balance due and delivery-lock state.
- [x] Add a useful empty state when no projects are found.
- [x] Improve portal action error handling.

## Stage 3: Build Josh's Operational Admin Dashboard

Goal: manage real studio work from one private dashboard.

- [x] Add admin overview data for leads, awaiting files, active projects, revisions, finals, balances, and recent activity.
- [x] Add project detail view with customer info, timeline, Drive links, files, revisions, payments, and email events.
- [x] Add admin status update action.
- [x] Add admin notes.
- [x] Add final delivery URL and unlock actions.
- [x] Add extra revision allowance action.
- [x] Keep setup/sandbox tools available as a setup section.

## Stage 4: Custom Quote Workflow

Goal: convert free reviews and custom projects into paid work without manual payment handling.

- [x] Add `api/admin/quotes.js` for creating and sending quotes.
- [x] Add quote persistence helpers in `lib/db/studio-records.js`.
- [x] Build quote line items from catalog pricing plus manual adjustments.
- [x] Send quote emails through Resend.
- [x] Show quote cards in the customer portal.
- [x] Add authenticated quote checkout start flow in the portal API.
- [x] Extend PayPal metadata and webhook handling for quote payments.
- [x] Mark accepted quotes and converted projects correctly after PayPal confirmation.

## Stage 5: Balance Payments And Delivery Locks

Goal: make deposits and final delivery safe and clear.

- [x] Add balance payment start flow.
- [x] Add portal balance payment action.
- [x] Extend PayPal webhook handling for balance payments.
- [x] Keep final files locked until the balance is paid.
- [x] Let admin mark finals ready and send balance-due email.
- [x] Unlock final files after full payment.

## Stage 6: Follow-Ups

Goal: reduce stale leads, missing files, pending quotes, unpaid balances, and unapproved finals.

- [x] Add follow-up selector logic.
- [x] Add protected Vercel cron route.
- [x] Add reminders for missing files.
- [x] Add reminders for pending quotes.
- [x] Add reminders for balance due.
- [x] Add reminders for final approval.
- [x] Prevent duplicate pending follow-up jobs.
- [x] Log every follow-up attempt.

## Stage 7: Live Launch Hardening

Goal: verify the complete production story before relying on it for real clients.

Current status:

- Local setup-wizard credential gate passes again with the custom `dirtcatrecords.com` Resend sender.
- Deploy guardrails pass locally and on push.
- Production public runtime responds correctly on the canonical `www` host.
- Production env names now cover the documented runtime requirements.
- Preview env names now cover the documented sandbox PayPal and server runtime requirements.
- The latest preview deployment is temporarily public for PayPal sandbox webhook testing.
- Preview browser checkout now reaches sandbox PayPal from the deployed preview URL.
- The remaining work is live-provider verification, not foundational feature buildout.

- [x] Run the admin sandbox test against real providers.
- [ ] Verify PayPal sandbox checkout and webhook end to end.
- [ ] Verify Supabase magic link redirects on the production domain.
- [ ] Verify Resend sender domain, reply-to, and deliverability.
- [ ] Verify Google Drive folder creation and sharing permissions.
- [x] Verify Vercel environment variables are set for production.
- [ ] Document the launch checklist in `README.md`.

## V1 Usability/Testability Contract

Goal: owner can run deterministic local/sandbox validation with dummy data and cleanup.

- [x] Add deterministic v1 sandbox harness scenario for checkout, quote, finals lock, and balance payment paths.
- [x] Extend v1 sandbox harness through final approval.
- [x] Add setup endpoint support for selecting harness scenario and deterministic testRunId.
- [x] Expand cleanup path to remove quote/project artifacts where allowed and safely close on fallback.
- [x] Add one-click `Run Owner Proof` admin action that focuses the showcase admin project and renders customer portal previews inline.
- [x] Add automated tests for scenario and cleanup behavior.
- [x] Document exact owner-run commands in `README.md`.

## Deployment Guardrail

Goal: keep Vercel Hobby deployments under the 12-function limit and fail fast before deploy.

- [x] Consolidate browser-safe config into `api/checkout-config.js`.
- [x] Consolidate portal quote and balance checkout starts into `api/portal/actions.js`.
- [x] Add `npm run deploy:preflight` for function-count, test, syntax, and diff checks.
- [x] Enforce `npm run deploy:preflight` in `.husky/pre-push`.
- [x] Document the deploy workflow in `docs/deployment-preflight.md` and `README.md`.
