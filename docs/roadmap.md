# Dirt Cat Records Roadmap

This document tracks the staged work needed to turn the current site, checkout, portal, and automation foundation into a reliable studio operations system.

For current handoff context, see [`docs/agent-handoff.md`](agent-handoff.md).
For architecture language and decisions, see [`CONTEXT.md`](../CONTEXT.md) and [`docs/adr/`](adr).
For the durable architecture gap register and anti-drift rules, see [`docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`](superpowers/specs/2026-05-20-architecture-readiness-review.md).

Current next focus: treat the current web app as the V1 launch candidate, keep future-product work out of the release scope, and move through final release packaging from a clean committed state.
Workflow hardening plan: [`docs/superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md`](superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md).
Ordered architecture follow-on: [`docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`](superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md).
Ordered deep-module follow-on after the PayPal seam work: [`docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`](superpowers/plans/2026-05-20-deep-modules-architecture-plan.md).
Future product exploration for the Logic Pro stem exporter lives in [`docs/superpowers/specs/2026-05-21-logic-stem-exporter-deep-modules.md`](superpowers/specs/2026-05-21-logic-stem-exporter-deep-modules.md). It is not part of the active Stage 7 launch-hardening slice.
The formal implementation plan for that separate desktop-app track lives in [`docs/superpowers/plans/2026-05-21-logic-stem-exporter-implementation-plan.md`](superpowers/plans/2026-05-21-logic-stem-exporter-implementation-plan.md).
Future growth-tool and lead-magnet exploration lives in [`docs/superpowers/specs/2026-05-21-dirt-cat-growth-tools-brainstorm.md`](superpowers/specs/2026-05-21-dirt-cat-growth-tools-brainstorm.md). It is not part of the active Stage 7 launch-hardening slice.

Current Stage 7 state: the local credential sanity gate passes again, the `v1-usability` Stage 7 sandbox run passes end to end locally against the real Supabase, Google Drive, and Resend integrations plus sandbox-like PayPal payment events, production runtime smoke is healthy on the canonical `www` host, preview has the correct sandbox PayPal environment split, and the owner has manually tested the current V1 website, checkout, portal, support, and provider workflow successfully. Shared preview provenance is now ledgered instead of copied into multiple editable docs. The remaining work is release discipline: keep the web app frozen unless a real launch blocker appears, commit only intentional launch-candidate changes, deploy production only from committed and pushed code, restore or confirm preview protection after webhook testing, and monitor the first real customer workflow.

Current workflow tooling state: the repo now includes workspace-level VS Code settings, extension recommendations, reusable tasks, a package-level `npm run dev:stack` convenience script, an environment parity audit, local env profile switch helpers that keep `.env.local` as the active runtime filename, a shared safe runtime fingerprint in the setup wizard, the public checkout config, and the env audit, a GitHub Actions preflight workflow, and a dedicated architecture readiness review so the Vercel, PayPal, Supabase, GitHub PR, GitHub Actions, GitLens, Thunder Client, and Prettier workflow has one durable document map.

Permanent workflow constraint: before every commit/push meant to be runtime-ready, run the credential sanity gate from `docs/operator-guide.md` and `docs/execution-trail.md`, including `npm run check:env`, the raw Google Drive folder id check, and the documented preview/production env audit when deployed provider behavior changes.

Immediate workflow constraints:

- shared preview alias must point only at a deployment from a pushed commit;
- dirty local Vercel deploys are diagnostic only and must not be used as the team-facing preview target;
- production deploys must come only from committed and pushed code;
- before any external retest, confirm the shared preview deployment URL, alias target, and pushed SHA.

Permanent documentation constraint: do not freeze preview URLs, exact worktree cleanliness, or point-in-time commit hashes into multiple editable docs. Confirm them from Vercel and git, keep the next action in `docs/agent-handoff.md`, and keep historical evidence in `docs/execution-log.md`.

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

- [x] Expand setup documentation in `docs/operator-guide.md` while keeping `README.md` as a reader-oriented project front door.
- [x] Expand `.env.example` so it matches the app's real runtime requirements.
- [x] Expand `.gitignore` for local, OS, and dependency noise.
- [x] Decide how to handle the large audio assets currently committed under `assets/`: keep the current WAV files for now, then replace the site previews with MP3 versions later.
- [x] Add workspace-level VS Code settings, tasks, and extension recommendations for the repo workflow.
- [x] Refine workspace extension recommendations so newly installed GitLens and Thunder Client map cleanly to the documented repo workflow.
- [ ] Confirm a fresh clone can be configured from docs.
- [x] Run `npm test`.
- [x] Run `npm run check:js`.

## Stage 1: Replace The Manual Paid Intake Flow

Goal: after payment, customers should follow the automated portal/email workflow instead of a `mailto:` intake form.

- [x] Update `success.html` to confirm payment and point users to portal/email instructions.
- [x] Update `success.js` to show the paid order summary without implying manual intake is the primary workflow.
- [x] Keep webhook-created projects, Drive folders, and upload-instruction emails as the source of truth.
- [x] Add or update tests for the paid success flow where practical.
- [x] Add a dedicated paid-customer support page and support request route so post-payment help no longer routes into the free-review flow.

## Stage 2: Make The Customer Portal Feel Real

Goal: customers should see clear next steps and only the actions that apply to the current project state.

- [x] Add status labels and next-step copy.
- [x] Hide final approval until final delivery is ready.
- [x] Show revision availability and used/included revision counts.
- [x] Show balance due and delivery-lock state.
- [x] Add a useful empty state when no projects are found.
- [x] Improve portal action error handling.
- [x] Keep portal action confirmations visible after login and refresh project cards after customer submissions.
- [x] Show unlimited revision access for friends free-code projects and add paid-project upsell links for extra revisions, new services, and custom add-ons. Consultation is included with every service, and rush delivery is no longer sold separately.
- [x] Normalize form control sizing so checkout, portal, and support inputs/buttons stay contained inside their panels, including the support form's dedicated centered layout and action-button layout.
- [x] Add visible Support navigation on the primary customer-facing pages.
- [x] Add visible Portal navigation on the primary customer-facing pages.
- [x] Collapse crowded customer navigation behind a responsive hamburger menu on narrow screens.
- [x] Resize and reposition mobile hero logos so they are not clipped by the fixed navigation.
- [x] Refine the mobile hamburger into a lighter left-side floating control and retune the home hero logo rhythm after live-device review.
- [x] Repair the homepage phone hero so the logo, headline, subtitle, and CTA fit the first mobile viewport without the open menu swallowing the page.
- [x] Recast the mobile hamburger menu as a vertical neon signal list instead of a two-column button grid.
- [x] Loosen the homepage phone hero back toward the checkout page's roomier mobile sizing after iPhone review.

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
- The deployment seam should be treated as `12/12` on the Vercel Hobby function cap until a fresh function-count check proves otherwise.
- Production public runtime responds correctly on the canonical `www` host.
- Production env names now cover the documented runtime requirements.
- Preview env names now cover the documented sandbox PayPal and server runtime requirements.
- The preview deployment used for sandbox webhook testing is intentionally not hardcoded here; confirm the active public target from Vercel before testing.
- The stable preview alias used by PayPal webhook delivery must point at that same active deployment before a checkout run is treated as diagnostic truth.
- Preview browser checkout now reaches sandbox PayPal and reaches `success.html` on the active diagnostic deployment.
- Preview webhook handling now accepts the real sandbox event pair (`CHECKOUT.ORDER.APPROVED` and `PAYMENT.CAPTURE.COMPLETED`) instead of ignoring the approved event and rejecting the capture event for missing buyer email.
- The capture route now tolerates sandbox responses where the initial PayPal order read omits `custom_id` but the capture response still includes valid checkout metadata.
- The setup wizard readiness report and the public checkout-config route now expose the same non-secret runtime fingerprint so the deployed preview environment can be compared directly against `npm run check:env:preview` before blaming PayPal, Supabase, or Resend.
- Customer portal auth now provisions confirmed Supabase users server-side for known customer emails before requesting browser magic links, which prevents the portal from falling into browser-driven signup confirmation.
- The portal magic-link UI now locks duplicate sends and applies a one-minute resend cooldown in the browser so Supabase OTP throttling is handled as a recoverable wait state instead of a raw retry failure.
- Hosted Supabase Auth URL Configuration has been corrected so generated links use the canonical `https://www.dirtcatrecords.com` flow.
- The portal auth preparation step now lives inside `api/portal/actions.js?action=auth` so the repo stays deployable on the Vercel Hobby function cap.
- The latest failed preview deployment email corresponded to a transient Vercel output-deploy failure: `vercel inspect --logs` showed the build completed, and the next preview deployment reached `Ready`.
- The shared preview alias used for browser retests was then repointed to that newer `Ready` deployment so the portal path now serves the resend-guarded `portal.js` instead of the older raw-error client.
- Owner manual acceptance has passed for the current launch candidate; future product work should stay parked until this version is released and observed.

- [x] Run the admin sandbox test against real providers.
- [x] Verify PayPal sandbox checkout and webhook end to end.
- [x] Correct hosted Supabase Auth URL Configuration so `Site URL` is `https://www.dirtcatrecords.com`, then verify production magic link redirects on the canonical domain.
- [x] Verify Resend sender domain, reply-to, and deliverability.
- [x] Verify Google Drive folder creation and sharing permissions.
- [x] Verify Vercel environment variables are set for production.
- [x] Document the launch checklist in `docs/operator-guide.md` and link it from `README.md`.

Ordered follow-on after the Stage 7 webhook proof:

- [x] Confirm the active sandbox webhook target in PayPal Developer matches the public preview deployment, then clean misleading active-preview references from editable docs.
- [ ] Keep the stable preview alias that PayPal uses repointed to the same deployment used for browser checkout before each webhook test or resend.
- [x] Centralize PayPal environment configuration into one module.
- [x] Split webhook identity construction from request-time signature verification.
- [x] Unify PayPal readiness checks across setup wizard and sandbox runner.
- [x] Add explicit runtime environment lifecycle invariants for development, preview, and production.
- [x] Extend payment-purpose routing with environment context.

Ordered workflow deepening after the PayPal environment plan:

- [x] Execute the Project payment transition Module slice from `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`.
- [x] Execute the Project event schema Module slice.
- [x] Execute the Quote lifecycle Module slice.
- [x] Execute the Portal Action policy Module slice.
- [x] Execute the follow-up orchestration Module slice.
- [x] Reassess email sequencing after the earlier slices and add the email sequence choreography Module.

## V1 Usability/Testability Contract

Goal: owner can run deterministic local/sandbox validation with dummy data and cleanup.

- [x] Add deterministic v1 sandbox harness scenario for checkout, quote, finals lock, and balance payment paths.
- [x] Extend v1 sandbox harness through final approval.
- [x] Add setup endpoint support for selecting harness scenario and deterministic testRunId.
- [x] Expand cleanup path to remove quote/project artifacts where allowed and safely close on fallback.
- [x] Add one-click `Run Owner Proof` admin action that focuses the showcase admin project and renders customer portal previews inline.
- [x] Add automated tests for scenario and cleanup behavior.
- [x] Document exact owner-run commands in `docs/operator-guide.md`.

## Deployment Guardrail

Goal: keep Vercel Hobby deployments under the 12-function limit and fail fast before deploy.

- [x] Consolidate browser-safe config into `api/checkout-config.js`.
- [x] Consolidate portal quote and balance checkout starts into `api/portal/actions.js`.
- [x] Add `npm run deploy:preflight` for function-count, test, syntax, and diff checks.
- [x] Enforce `npm run deploy:preflight` in `.husky/pre-push`.
- [x] Add a GitHub Actions workflow that runs the same deploy preflight on pull requests and pushes to `main`.
- [x] Document the deploy workflow in `docs/deployment-preflight.md`, `docs/operator-guide.md`, and the `README.md` doc map.
