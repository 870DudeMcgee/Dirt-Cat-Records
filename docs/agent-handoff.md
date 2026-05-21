# Agent Handoff

This file is the current handoff for Dirt Cat Records. Keep it compact and current. Do not use it as a changelog; use it to point the next session at the right source-of-truth docs and the exact next action.

## Current Repo State

- Working repo: `/Users/jewelbait/Desktop/DirtCatRecords`
- Remote: `https://github.com/870DudeMcgee/Dirt-Cat-Records.git`
- Branch: `main` (treat as the integration branch, not the long-lived scratch branch)
- Latest pushed commit and worktree cleanliness must be confirmed from git at session start with `git log -1 --oneline` and `git status -sb`.
- This handoff intentionally avoids freezing the active preview URL or point-in-time commit hash into durable prose because those were recurring drift sources.
- Additional branch note: `studio-automation-system` exists as another branch pointer but is not checked out and is not affecting `main`.
- Commit email used for pushed work: `Josh Mclean <870DudeMcgee@users.noreply.github.com>`

Do not reset, discard, or restage blindly. Start from the live worktree, treat historical preview URLs in older docs as history rather than config, and re-check PayPal/Vercel settings before changing preview protection again.
If `main` is dirty when a new implementation slice starts, recover by branching or moving the work into a task worktree before continuing.

## Read First

1. `docs/roadmap.md`
2. `docs/execution-log.md`
3. `README.md`
4. This file
5. `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`
6. `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
7. `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
8. `docs/superpowers/plans/2026-05-19-v1-usability-testability-contract.md`
9. Future product only: `docs/superpowers/specs/2026-05-21-logic-stem-exporter-deep-modules.md`
10. Future product implementation plan only: `docs/superpowers/plans/2026-05-21-logic-stem-exporter-implementation-plan.md`
11. Future growth tools only: `docs/superpowers/specs/2026-05-21-dirt-cat-growth-tools-brainstorm.md`

## Current Focus

Stage 7 launch hardening is effectively in launch-candidate state. Workflow hardening Tasks 0 through 3 are now in place, and the shared preview alias has been reset onto a clean preview deployment published from pushed `ae958f9` and recorded in `docs/deployment-ledger.md`. The feature foundation is in place through Stage 6, the local setup gate passes again, the local `v1-usability` sandbox run passes end to end, the public production runtime responds on the canonical `www` host, and preview has the correct sandbox PayPal env split. Preview browser checkout reaches the success page, the paid-success flow has a dedicated project-support path instead of bouncing customers back into the marketing site, and the latest debugging pass confirmed and fixed the full preview webhook chain: checkout and webhook delivery were first split across two deployments, the webhook parser was updated to handle the actual sandbox event shapes, and the Drive-sharing verification now passes on preview by using a preview-only share override account.

The customer portal magic-link seam now has a confirmed app-side fix too: `portal.js` calls the merged server-backed `api/portal/actions.js?action=auth` preparation step so known customer emails get a confirmed Supabase auth user before the browser requests a magic link, and the browser request now sets `shouldCreateUser: false` to avoid signup-confirmation fallback. The hosted Supabase Auth URL Configuration has now been corrected too: generated confirmation links use `https://www.dirtcatrecords.com` instead of the invalid schemeless redirect.

The immediate next gap is release discipline, not more site feature work. The owner has manually tested the current V1 website, checkout, portal, support, and provider workflow and reported that it works well. `npm run deploy:preflight` also passed on 2026-05-21 with function count `12/12`, `297` tests passing, JavaScript syntax checks passing, and `git diff --check` passing. Next work should freeze V1 behavior, commit only intentional launch-candidate changes, deploy production only from committed and pushed code, restore or confirm preview protection after webhook testing, and monitor the first real customer workflow. Future product tracks should stay parked until the launch candidate is released and observed.

A separate future-product brainstorm now exists for the Logic Pro stem exporter desktop app at `docs/superpowers/specs/2026-05-21-logic-stem-exporter-deep-modules.md`, with an executable follow-on plan at `docs/superpowers/plans/2026-05-21-logic-stem-exporter-implementation-plan.md`. Treat both as future product work until the web launch has settled and the separate `dirtcat-stem-exporter` repo is explicitly started.

A broader future-product brainstorm now exists for Dirt Cat growth tools, lead magnets, education, community, and quick-win service offers at `docs/superpowers/specs/2026-05-21-dirt-cat-growth-tools-brainstorm.md`. Treat it as captured product exploration only until the web launch has settled and one slice is approved for planning.

Current constraints that matter before new feature work:

- Do not continue using dirty local Vercel deploys as the shared preview alias; that is now treated as a workflow defect, not a normal debugging shortcut.
- Do not treat any shared preview alias as trustworthy until its target deployment and pushed SHA have been checked from Vercel and git.
- Do not deploy to production from a worktree whose changes are not committed and pushed.
- Record every shared preview and production deployment in `docs/deployment-ledger.md` once the target deployment URL, alias target, and pushed SHA are known.
- Treat diagnostic preview and shared preview as different classes: diagnostic preview is for ad hoc debugging only, while shared preview is the only preview class eligible for alias use and external retests.
- The deployment seam should be treated as `12/12` on the Vercel Hobby function cap until a fresh function-count check proves otherwise.
- Do not add a new Vercel Function entrypoint for architecture cleanup unless the same slice also removes or consolidates an existing entrypoint; the deep-module plan assumes no casual API sprawl.
- One preview deployment on 2026-05-20 failed only after `vercel build` completed and the immediately following preview reached `Ready`; treat that single failure as transient unless the same output-deploy error starts repeating.
- The active preview deployment for webhook testing must be confirmed from Vercel before use.
- The stable preview alias used by PayPal webhook delivery and browser retests must point at that same deployment before any checkout/webhook or portal result is treated as trustworthy.
- PayPal sandbox currently emits `CHECKOUT.ORDER.APPROVED` and `PAYMENT.CAPTURE.COMPLETED` for this checkout flow; older assumptions about `CHECKOUT.ORDER.COMPLETED` were wrong for the path we are exercising.
- `npx vercel env pull` can preserve key names while writing empty placeholder values on this machine, so pulled files are key-presence/profile audits only.
- `GET /api/checkout-config` and `GET /api/admin/setup-wizard?action=setup` now include the same safe runtime fingerprint; prefer the public checkout-config route first, then use the admin setup route when readiness sections matter too.
- PayPal runtime lifecycle is now code-backed by `lib/env/runtime-environment.js`; PayPal readiness fails when production is wired to sandbox or preview/development are wired to live.
- Customer portal magic-link requests now go through `api/portal/actions.js?action=auth`, which provisions confirmed auth users only for known customer emails before the browser sends `signInWithOtp(... shouldCreateUser: false)`.
- `portal.js` now also prevents duplicate sends in the same tab and applies a one-minute resend cooldown when Supabase returns an OTP rate-limit error.
- Portal action feedback is now shell-level instead of inside the hidden login panel, so revision requests, file-link submissions, quote/balance checkout starts, and final approvals give customers visible confirmation after login.
- Friends free-code checkout projects now persist a high included-revision count and render as unlimited revisions in the customer portal. Paid project cards now include a small upsell panel for extra revision requests, another checkout service, or a custom add-on request through the support form.
- Checkout now treats consultation as included with every service and no longer sells Rush Delivery or Consultation Call as add-ons. The no-charge checkout action remains scoped to the discount-code path so paid customers stay on PayPal.
- Shared form CSS now uses border-box sizing and shrink-safe grid controls so checkout, portal, and support inputs/buttons do not overflow their glass panels. The support page also has its own centered one-column layout, inset form surface, shrink-safe field grid, and action-button layout so narrow screens do not crowd the card.
- Primary pages now include a standard Support navigation link that points to `support.html`.
- Primary pages now include a standard Portal navigation link and load `nav.js`, which enhances the shared fixed nav with an accessible hamburger menu on narrow screens. After Mobile View review, the mobile trigger now sits as a lighter left-side floating control instead of a heavy full-width black bar, and the open menu is a vertical neon signal list instead of a two-column button grid.
- Mobile logo sizing and spacing have been tightened so the floating header no longer clips or crowds the checkout-style hero logos on customer-facing pages. After iPhone comparison, the homepage phone hero now borrows more of the checkout page's roomy rhythm: larger inline logo, wider headline/subtitle, full-width CTA stack, and safer `100svh` layout so it has presence without dropping the CTAs out of the first viewport.
- That auth preparation path was merged into the existing portal function specifically to stay under the Vercel Hobby 12-function deployment cap.
- The shared preview alias now points at a clean preview deployment published from pushed `ae958f9`; still confirm alias mapping and the latest ledger row from Vercel before the next external test.

Recently landed workflow and PayPal changes:

- `api/capture-paypal-order.js` now restores checkout metadata from either the pre-capture order read or the capture response.
- `test/paypal-api.test.js` now covers the case where the initial PayPal order read omits `custom_id` but the capture response still includes valid checkout metadata.
- `lib/paypal/environment-config.js` now owns PayPal environment normalization, base-url selection, and non-secret presence diagnostics for client credentials and webhook id.
- `lib/paypal/client-factory.js`, `lib/paypal/webhook.js`, `lib/automation/setup-checks.js`, and `api/create-paypal-order.js` now consume the shared PayPal environment module instead of re-deriving sandbox/live configuration independently.
- `lib/paypal/webhook-verifier.js` now constructs PayPal webhook identity up front and leaves request-time verification focused on headers, event body, and PayPal's verification response.
- `api/webhooks/paypal.js` now builds its default verifier at handler construction and reports configuration failures through the existing server-error path instead of discovering missing webhook identity during the first live request.
- `lib/paypal/readiness.js` now owns non-network PayPal readiness diagnostics used by setup checks and sandbox test mode.
- `lib/env/runtime-environment.js` now owns development/preview/production lifecycle inference and the PayPal lifecycle invariant consumed by PayPal readiness and business config.
- `lib/paypal/payment-router.js` now passes runtime environment context into payment-purpose handlers as a second argument, preserving existing Checkout Payment, Quote Payment, and Balance Payment behavior while allowing future routing decisions to see lifecycle state.
- `lib/automation/project-payment-transition.js` now owns Project financial transition policy for checkout project creation, quote payment conversion, and balance payment completion; `delivery-lock.js` remains only as a compatibility alias over that deeper Module.
- `lib/automation/project-event-schema.js` now owns canonical Project event types, actors, messages, and metadata shapes for workflow, portal, follow-up, and admin events; persistence code normalizes events before writing to Supabase.
- `lib/automation/quote-lifecycle.js` now owns Quote creation, send, view, checkout eligibility, amount-due, and accepted-state transition decisions used by admin quote persistence, portal quote checkout, and PayPal quote payment confirmation.
- `lib/portal/action-policy.js` now owns Portal Action eligibility, visibility, denial reasons, and balance-payment amount decisions used by browser action rules, balance payment validation, and final approval authority checks.
- `lib/automation/follow-up-orchestrator.js` now owns follow-up candidate selection, queue intent normalization, enqueue outcome classification, and cron pipeline sequencing while Supabase persistence and email dispatch remain Adapters.
- `lib/email/email-sequence-choreographer.js` now owns workflow email ordering, email-event metadata, follow-up reminder message choreography, and send/failure classification while `lib/email/resend.js` remains the Resend transport/template Adapter.
- `lib/automation/test-mode-runner.js` now records PayPal readiness as an early sandbox report step, so setup wizard readiness and sandbox runs expose the same configuration conclusion.
- `scripts/check-env-parity.js`, `package.json`, and `.vscode/tasks.json` now provide the env parity audit and the updated workflow task surface.
- `lib/env/runtime-fingerprint.js`, `api/checkout-config.js`, `lib/automation/setup-checks.js`, and `scripts/check-env-parity.js` now expose the same non-secret runtime fingerprint on deployed preview surfaces and local env audits.

Deployment guardrail status:

- Vercel Hobby function count is back under the limit after consolidating portal quote/balance checkout into `api/portal/actions.js`.
- `.husky/pre-push` now runs `npm run deploy:preflight`, so a normal push fails locally before Vercel receives an over-limit deploy.

What is already in the repo now:

- Stage 7 setup-check hardening in `lib/automation/setup-checks.js`
- Resend sender guard in `lib/email/resend.js` that fails setup early for public inbox sender domains
- Google Drive readiness probe in `lib/google/drive.js`
- focused tests for the Drive readiness probe in `test/google-drive.test.js` and `test/setup-checks.test.js`
- focused tests for Resend sender validation in `test/resend-email.test.js`
- deploy guardrail enforcement in `.husky/pre-push` and `package.json`
- environment parity audit in `scripts/check-env-parity.js`, `package.json`, and `.vscode/tasks.json`
- local env profile helpers in `scripts/use-local-env.js` and `package.json` that keep `.env.local` as the runtime-active filename while switching stored preview/production profiles
- package-level local stack convenience in `package.json` via `npm run dev:stack`
- local Supabase stack configuration in `supabase/config.toml`
- GitHub Actions preflight workflow in `.github/workflows/ci.yml`
- workspace VS Code settings, tasks, and extension recommendations in `.vscode/`
- GitLens and Thunder Client are now included in the repo recommendations, while Live Server / Tailwind / Docker / ESLint are documented as non-authoritative or not yet wired for this codebase
- portal payment-start consolidation in `api/portal/actions.js` and `portal.js`
- documentation updates in `README.md`, `.env.example`, `docs/deployment-preflight.md`, and `docs/execution-trail.md`
- architecture tracking plan for PayPal environment and webhook deepening in `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
- architecture gap register and anti-drift rules in `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`

End-product target:

- a studio operations system where checkout, quote conversion, balance collection, Drive setup, email, portal actions, delivery lock, owner admin operations, and stale-project follow-ups all run from the same repo and operational workflow.

## Validation Already Run

These passed after Stage 6 completion:

```bash
node --test test/follow-up-dispatcher.test.js test/follow-up-cron-api.test.js test/follow-up-selector.test.js test/studio-records.test.js
npm run check:js
git diff --check
```

These also passed during local runtime smoke validation:

```bash
curl -sS "http://localhost:3000/api/cron/follow-ups?dryRun=true" \
   -H "authorization: Bearer $CRON_SECRET"
curl -sS "http://localhost:3000/api/cron/follow-ups?dryRun=false&dispatch=true" \
   -H "authorization: Bearer $CRON_SECRET"
node --test test/follow-up-dispatcher.test.js test/follow-up-cron-api.test.js test/studio-records.test.js
```

Stage 7 validation note:

- `GET /api/admin/setup-wizard?action=setup` originally reported `overallStatus: passed`, which was misleading.
- The first Stage 7 sandbox run (`dcrtest-sbx-20260519T160000-stage7a`) failed with `Sandbox free review did not create all required Drive folders.`
- The recorded `drive_failed` event showed the real provider error: `Unable to search Google Drive folders: File not found: ...`
- Setup checks now run a live Google Drive access probe, and the setup endpoint correctly fails in `storage` when the Drive folder configuration is invalid.
- The concrete Drive misconfiguration was fixed by switching `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` to the raw folder id form the app expects.
- The docs now include a permanent credential todo list, raw Drive folder id extraction steps, and a required pre-commit/pre-push credential sanity gate.
- Portal quote checkout and balance payment start actions now live in `api/portal/actions.js`, which keeps the deployed function count at 11.
- `GET /api/admin/setup-wizard?action=setup` now passes locally, including `storage`.
- `GET /api/admin/setup-wizard?action=setup` now fails early in `email` when `RESEND_FROM_EMAIL` uses a public inbox domain like `gmail.com`, and passes again after switching the local sender to `Dirt Cat Records <studio@dirtcatrecords.com>`.
- The Stage 7 sandbox run `dcrtest-sbx-20260519T113900-stage7c` passed end to end.
- The cleanup path for `dcrtest-sbx-20260519T113900-stage7c` also passed with `cleanupStatus: cleaned`.
- `npx vercel env ls production` now shows the required site/admin, Resend, Google Drive, cron, PayPal, and Supabase env names for the documented runtime.
- `npx vercel env ls preview` now shows the required site/admin, Resend, Google Drive, cron, Supabase, and sandbox PayPal env names for the documented preview runtime.
- `https://www.dirtcatrecords.com/portal.html` and `https://www.dirtcatrecords.com/admin.html` return `200`.
- `GET https://www.dirtcatrecords.com/api/checkout-config` returns valid public runtime config.
- `GET https://www.dirtcatrecords.com/api/admin/setup-wizard?action=setup` returns `401` without admin auth, which is expected.
- `npm run deploy:preflight` passed locally before push, and the same preflight passed again inside the successful `git push origin main`.
- Preview checkout on `https://dirt-cat-records-6gejuepr6-dirt-cat-records-projects.vercel.app/checkout.html` now completes the browser path successfully, with Vercel logs showing `POST /api/create-paypal-order 200`, `POST /api/capture-paypal-order 200`, and `GET /success.html 200`.
- The capture-route fix became reliable only after deriving checkout metadata from a PayPal order read and explicitly requesting full resource representations with `Prefer: return=representation`.
- The capture route now also falls back to capture-response metadata when the initial order read still omits `custom_id`, which matches the current preview-browser failure more closely than the earlier mocked path.
- Preview support page deployment: `https://dirt-cat-records-gtx14oyqe-dirt-cat-records-projects.vercel.app/support.html`.
- Focused support-flow validation passed locally:

```bash
node --test test/success-page.test.js test/project-support-page.test.js test/project-support-api.test.js
npm run check:js
node scripts/check-vercel-function-limit.js
```

- The repo should currently be treated as exactly at the Vercel Hobby function cap after adding `api/public/project-support.js`: `12/12`.
- Vercel Authentication is temporarily disabled at the project level (`ssoProtection: null`) so PayPal sandbox webhooks can reach preview.
- Unauthenticated HTTP checks against the preview deployment now return app responses instead of a Vercel login wall: `GET /checkout.html` returns `200`, malformed `POST /api/webhooks/paypal` returns `400`, and the dedicated support page serves without auth.
- A repo-wide search found no hardcoded `vercel.app` URLs in runtime `.js`, `.html`, `.css`, or `.sql` files; the stale preview references found so far are documentation/history only.
- On this machine, `npx vercel env pull` currently preserves the expected env key names but can write empty placeholder values into the pulled file; use pulled files for key-presence/profile audits, not as proof that deployed secrets are populated.
- Vercel logs for the latest checkout showed `POST /api/create-paypal-order 200`, `POST /api/capture-paypal-order 200`, and `GET /success.html 200` on the active diagnostic deployment, but `POST /api/webhooks/paypal` landed on the stable preview alias instead.
- `npx vercel alias ls` confirmed the stable preview alias was still pinned to an older preview deployment, which explained why the webhook path was not exercising the same build as checkout.
- The stable preview alias has now been repointed to the current diagnostic deployment, and its public `GET /api/checkout-config` output now matches the fresh build shape again, including `publicAppOrigin` and `runtimeFingerprint`.
- The webhook parser now accepts `CHECKOUT.ORDER.APPROVED` and hydrates `PAYMENT.CAPTURE.COMPLETED` from the related PayPal order when the capture payload omits buyer email.
- After deploying that fix to preview and resending the latest real PayPal events, preview created `orders`, `payments`, `projects`, `project_events`, and `email_events` successfully.
- Preview now uses `GOOGLE_DRIVE_TEST_SHARE_EMAIL` outside live mode so sandbox verification can share upload folders with a real Google account while leaving live behavior unchanged.
- The latest preview checkout created Drive folders successfully, persisted Drive URLs on the project record, and the upload folder permissions now include `870skitzofrenzy@gmail.com` as a `writer`.

Pre-commit review status:

- A review was requested before commit.
- One high-severity dispatcher crash path was found.
- That issue was fixed by making email-event logging non-blocking in error paths.
- A regression test was added.

## Next Session Start Here

1. Use Vercel, git, and `docs/deployment-ledger.md` to confirm the currently active shared preview deployment, alias target, and pushed SHA before opening checkout or checking webhook logs.
2. Keep the V1 web app frozen unless a real launch blocker appears.
3. Review the current dirty worktree and commit only intentional launch-candidate docs/code.
4. Deploy production only from a committed and pushed SHA.
5. Restore or confirm Vercel Authentication / preview protection after preview webhook testing is complete.
6. Monitor the first real customer workflow through PayPal, Supabase, Google Drive, Resend, the portal, and the admin dashboard.
7. Keep the Logic stem exporter and growth-tool brainstorms as future product work until this launch has settled.

Workflow note for the next session:

- Start from `git status -sb` and `git log -1 --oneline --decorate`, then create or switch to a task branch before editing.
- Use `wip/<topic>` or `fix/<topic>` as the normal branch shape; create a git worktree when isolation matters.
- Use `npm run record:deployment -- ...` to append shared preview and production provenance instead of copying deployment facts into multiple editable docs.
- Prefer `npm run dev:vercel` over Live Server for local runtime validation because checkout, webhook, admin, and portal flows depend on Vercel Functions.
- Use `npm run dev:stack` when you want package-level convenience for starting Supabase and then the Vercel dev runtime; do not treat it as a VS Code task, because it currently is not one.
- Prefer `npx vercel ...` and `npx supabase ...` as the documented CLI path unless a specific local extension workflow proves it needs a global install on `PATH`.
- Run `npm run check:env` locally and the documented preview/production env-pull audit before treating provider issues as extension failures.
- Use `npm run env:use:preview` and `npm run env:use:production` to switch local profiles without changing what the runtime loader reads; `.env.local` remains the active filename.
- Treat pulled Vercel env files as key-presence/profile audits only when they come back with empty placeholders; verify populated deployed values from the Vercel UI/extension when a provider issue depends on the actual secret contents.
- Prefer Thunder Client only as a GUI wrapper around the documented API smoke paths, not as a replacement for the repo docs.
- Use the architecture readiness review when deciding whether a new task is Stage 7 verification work or PayPal seam-deepening work.

## Source Of Truth Rules

- Roadmap status lives in `docs/roadmap.md`.
- Step-by-step implementation truth lives in `docs/execution-log.md`.
- Runtime/operator commands live in `README.md`.
- Architecture gap tracking and anti-drift rules live in `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`.
- Ordered PayPal environment/webhook work lives in `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`.
- Ordered deep-module workflow deepening lives in `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`.
- Architecture language lives in `CONTEXT.md` and `docs/adr/`.

If these disagree, update the stale doc before continuing.

## Suggested Skills For The Next Session

1. `/Users/jewelbait/.agents/skills/using-superpowers/SKILL.md`
2. `/Users/jewelbait/.agents/skills/executing-plans/SKILL.md`
3. `/Users/jewelbait/.agents/skills/verification-before-completion/SKILL.md`
4. `/Users/jewelbait/.agents/skills/doc-coauthoring/SKILL.md`
5. `/Users/jewelbait/.agents/skills/requesting-code-review/SKILL.md`
