# Agent Handoff

This file is the current handoff for Dirt Cat Records. Keep it compact and current. Do not use it as a changelog; use it to point the next session at the right source-of-truth docs and the exact next action.

## Current Repo State

- Working repo: `/Users/jewelbait/Desktop/DirtCatRecords`
- Remote: `https://github.com/870DudeMcgee/Dirt-Cat-Records.git`
- Branch: `main`
- Last pushed commit: `3162aa2 fix deploy guardrail and setup checks`
- Current worktree: dirty with uncommitted Stage 7 Resend setup-gate hardening, local env change, and docs updates on top of `origin/main`.
- Commit email used for pushed work: `Josh Mclean <870DudeMcgee@users.noreply.github.com>`

Do not reset, discard, or restage blindly. Start from the live worktree.

## Read First

1. `docs/roadmap.md`
2. `docs/execution-log.md`
3. `README.md`
4. This file
5. `docs/superpowers/plans/2026-05-19-v1-usability-testability-contract.md`

## Current Focus

Stage 7 launch hardening is now the only major delivery slice left. The feature foundation is in place through Stage 6, the local setup gate passes again, the local `v1-usability` sandbox run now passes end to end, and the public production runtime is responding on the canonical `www` host. Production env parity is now in place for live testing. The next gap is the remaining live-verification work plus the still-incomplete preview env set for safe preview testing.

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
- `npx vercel env ls preview` now shows the added site/admin, Resend, Google Drive, and cron vars, but is still missing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and PayPal vars.
- `https://www.dirtcatrecords.com/portal.html` and `https://www.dirtcatrecords.com/admin.html` return `200`.
- `GET https://www.dirtcatrecords.com/api/checkout-config` returns valid public runtime config.
- `GET https://www.dirtcatrecords.com/api/admin/setup-wizard?action=setup` returns `401` without admin auth, which is expected.
- `npm run deploy:preflight` passed locally before push, and the same preflight passed again inside the successful `git push origin main`.

Last successful push summary:

- Commit: `3162aa2 fix deploy guardrail and setup checks`
- Branch state after push: clean `main`, aligned with `origin/main`

Pre-commit review status:

- A review was requested before commit.
- One high-severity dispatcher crash path was found.
- That issue was fixed by making email-event logging non-blocking in error paths.
- A regression test was added.

## Next Session Start Here

1. Verify Supabase magic-link redirects on the production domain.
2. Verify PayPal sandbox checkout plus webhook behavior beyond the sandbox-like automation path.
3. Verify Google Drive folder sharing permissions from the successful Stage 7 sandbox path.
4. Verify Resend sender, reply-to, and deliverability behavior beyond provider acceptance.
5. Fill the still-missing preview env values so preview can use sandbox PayPal safely.
6. Document the final launch checklist in `README.md` and mark the completed Stage 7 items in `docs/roadmap.md`.

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
