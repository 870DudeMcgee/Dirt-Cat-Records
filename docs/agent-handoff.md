# Agent Handoff

This file is the current handoff for Dirt Cat Records. Keep it compact and current. Do not use it as a changelog; use it to point the next session at the right source-of-truth docs and the exact next action.

## Current Repo State

- Working repo: `/Users/jewelbait/Desktop/DirtCatRecords`
- Remote: `https://github.com/870DudeMcgee/Dirt-Cat-Records.git`
- Branch: `main`
- Last pushed commit: `668c7dc add shared workflow tooling`
- Current worktree: includes unpushed PayPal preview checkout fixes in `api/capture-paypal-order.js`, `lib/paypal/client-factory.js`, `test/paypal-api.test.js`, and `test/paypal-client-factory.test.js`, plus the new paid-customer support flow in `support.html`, `support.js`, `api/public/project-support.js`, and related tests/docs.
- Commit email used for pushed work: `Josh Mclean <870DudeMcgee@users.noreply.github.com>`

Do not reset, discard, or restage blindly. Start from the live worktree and re-check Vercel project settings before changing preview protection again.

## Read First

1. `docs/roadmap.md`
2. `docs/execution-log.md`
3. `README.md`
4. This file
5. `docs/superpowers/plans/2026-05-19-v1-usability-testability-contract.md`

## Current Focus

Stage 7 launch hardening is now the only major delivery slice left. The feature foundation is in place through Stage 6, the local setup gate passes again, the local `v1-usability` sandbox run now passes end to end, the public production runtime is responding on the canonical `www` host, and preview now has the correct sandbox PayPal env split. Preview browser checkout now also reaches the success page on the latest diagnostic deployment, and the paid-success flow now has a dedicated project-support path instead of bouncing customers back into the marketing site. The immediate next gap is to confirm the real PayPal webhook/automation round-trip after that successful sandbox checkout, followed by the remaining provider and magic-link checks.

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
- GitHub Actions preflight workflow in `.github/workflows/ci.yml`
- workspace VS Code settings, tasks, and extension recommendations in `.vscode/`
- GitLens and Thunder Client are now included in the repo recommendations, while Live Server / Tailwind / Docker / ESLint are documented as non-authoritative or not yet wired for this codebase
- portal payment-start consolidation in `api/portal/actions.js` and `portal.js`
- documentation updates in `README.md`, `.env.example`, `docs/deployment-preflight.md`, and `docs/execution-trail.md`

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
- The first Stage 7 sandbox run (`sandbox-20260519T160000-stage7a`) failed with `Sandbox free review did not create all required Drive folders.`
- The recorded `drive_failed` event showed the real provider error: `Unable to search Google Drive folders: File not found: ...`
- Setup checks now run a live Google Drive access probe, and the setup endpoint correctly fails in `storage` when the Drive folder configuration is invalid.
- The concrete Drive misconfiguration was fixed by switching `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` to the raw folder id form the app expects.
- The docs now include a permanent credential todo list, raw Drive folder id extraction steps, and a required pre-commit/pre-push credential sanity gate.
- Portal quote checkout and balance payment start actions now live in `api/portal/actions.js`, which keeps the deployed function count at 11.
- `GET /api/admin/setup-wizard?action=setup` now passes locally, including `storage`.
- `GET /api/admin/setup-wizard?action=setup` now fails early in `email` when `RESEND_FROM_EMAIL` uses a public inbox domain like `gmail.com`, and passes again after switching the local sender to `Dirt Cat Records <studio@dirtcatrecords.com>`.
- The Stage 7 sandbox run `sandbox-20260519T113900-stage7c` passed end to end.
- The cleanup path for `sandbox-20260519T113900-stage7c` also passed with `cleanupStatus: cleaned`.
- `npx vercel env ls production` now shows the required site/admin, Resend, Google Drive, cron, PayPal, and Supabase env names for the documented runtime.
- `npx vercel env ls preview` now shows the required site/admin, Resend, Google Drive, cron, Supabase, and sandbox PayPal env names for the documented preview runtime.
- `https://www.dirtcatrecords.com/portal.html` and `https://www.dirtcatrecords.com/admin.html` return `200`.
- `GET https://www.dirtcatrecords.com/api/checkout-config` returns valid public runtime config.
- `GET https://www.dirtcatrecords.com/api/admin/setup-wizard?action=setup` returns `401` without admin auth, which is expected.
- `npm run deploy:preflight` passed locally before push, and the same preflight passed again inside the successful `git push origin main`.
- Preview checkout on `https://dirt-cat-records-6gejuepr6-dirt-cat-records-projects.vercel.app/checkout.html` now completes the browser path successfully, with Vercel logs showing `POST /api/create-paypal-order 200`, `POST /api/capture-paypal-order 200`, and `GET /success.html 200`.
- The capture-route fix became reliable only after deriving checkout metadata from a PayPal order read and explicitly requesting full resource representations with `Prefer: return=representation`.
- Preview support page deployment: `https://dirt-cat-records-gtx14oyqe-dirt-cat-records-projects.vercel.app/support.html`.
- Focused support-flow validation passed locally:

```bash
node --test test/success-page.test.js test/project-support-page.test.js test/project-support-api.test.js
npm run check:js
node scripts/check-vercel-function-limit.js
```

- The repo is now exactly at the Vercel Hobby function cap after adding `api/public/project-support.js`: `12/12`.
- Vercel Authentication is temporarily disabled at the project level (`ssoProtection: null`) so PayPal sandbox webhooks can reach preview.
- Unauthenticated HTTP checks against the preview deployment now return app responses instead of a Vercel login wall: `GET /checkout.html` returns `200`, malformed `POST /api/webhooks/paypal` returns `400`, and the dedicated support page serves without auth.

Last successful push summary:

- Commit: `668c7dc add shared workflow tooling`
- Branch state after push: clean `main`, aligned with `origin/main`, before the current unpushed PayPal/support changes.

Pre-commit review status:

- A review was requested before commit.
- One high-severity dispatcher crash path was found.
- That issue was fixed by making email-event logging non-blocking in error paths.
- A regression test was added.

## Next Session Start Here

1. Inspect PayPal sandbox webhook deliveries for the successful checkout on `https://dirt-cat-records-6gejuepr6-dirt-cat-records-projects.vercel.app/checkout.html` and confirm whether the preview webhook route processed the event.
2. Smoke-test the dedicated support flow on `https://dirt-cat-records-gtx14oyqe-dirt-cat-records-projects.vercel.app/support.html`, including one real support submission if desired.
3. Verify Supabase magic-link redirects on the production domain.
4. Verify Google Drive folder sharing permissions from the successful Stage 7 sandbox path.
5. Verify Resend sender, reply-to, and deliverability behavior beyond provider acceptance.
6. Decide whether to keep the repo at `12/12` functions or consolidate another public route before future feature additions.
7. Restore Vercel Authentication after preview webhook testing is complete, then commit and push the PayPal/support/doc updates.

Workflow note for the next session:

- Prefer `npm run dev:vercel` over Live Server for local runtime validation because checkout, webhook, admin, and portal flows depend on Vercel Functions.
- Prefer Thunder Client only as a GUI wrapper around the documented API smoke paths, not as a replacement for the repo docs.

## Source Of Truth Rules

- Roadmap status lives in `docs/roadmap.md`.
- Step-by-step implementation truth lives in `docs/execution-log.md`.
- Runtime/operator commands live in `README.md`.
- Architecture language lives in `CONTEXT.md` and `docs/adr/`.

If these disagree, update the stale doc before continuing.

## Suggested Skills For The Next Session

1. `/Users/jewelbait/.agents/skills/verification-before-completion/SKILL.md`
2. `/Users/jewelbait/.agents/skills/doc-coauthoring/SKILL.md`
3. `/Users/jewelbait/.agents/skills/requesting-code-review/SKILL.md`
4. `/Users/jewelbait/.claude/skills/productivity/handoff/SKILL.md`
5. `/Users/jewelbait/.claude/skills/engineering/grill-with-docs/SKILL.md`
