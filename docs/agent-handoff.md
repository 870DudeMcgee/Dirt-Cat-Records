# Agent Handoff

This file is the current handoff for Dirt Cat Records. Keep it compact and current. Do not use it as a changelog; use it to point the next session at the right source-of-truth docs and the exact next action.

## Current Repo State

- Working repo: `/Users/jewelbait/Desktop/DirtCatRecords`
- Remote: `https://github.com/870DudeMcgee/Dirt-Cat-Records.git`
- Branch: `main`
- Last pushed commit: `85dddab feat: add stage 6 follow-up automation`
- Current worktree: dirty with uncommitted Stage 7 setup-check hardening and permanent credential-workflow documentation updates.
- Commit email used for pushed work: `Josh Mclean <870DudeMcgee@users.noreply.github.com>`

Do not reset, discard, or restage blindly. Start from the live worktree.

## Read First

1. `docs/roadmap.md`
2. `docs/execution-log.md`
3. `README.md`
4. This file
5. `docs/superpowers/plans/2026-05-19-v1-usability-testability-contract.md`

## Current Focus

Stage 7 launch hardening has started. The first real-provider sandbox attempt is blocked by Google Drive configuration, setup checks now surface that blocker directly, and the repo docs now define a permanent credential sanity gate before commit/push.

Deployment guardrail status:

- Vercel Hobby function count is back under the limit after consolidating portal quote/balance checkout into `api/portal/actions.js`.
- `.husky/pre-push` now runs `npm run deploy:preflight`, so a normal push fails locally before Vercel receives an over-limit deploy.

What is in the worktree now:

- Stage 7 setup-check hardening in `lib/automation/setup-checks.js`
- Google Drive readiness probe in `lib/google/drive.js`
- focused tests for the Drive readiness probe in `test/google-drive.test.js` and `test/setup-checks.test.js`
- execution updates in `docs/execution-log.md`, `README.md`, `.env.example`, `docs/deployment-preflight.md`, and `docs/execution-trail.md`

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
- The concrete blocker is that `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` is configured as a full Google Drive URL in the runtime environment, but the app expects the raw folder id.
- The docs now include a permanent credential todo list, raw Drive folder id extraction steps, and a required pre-commit/pre-push credential sanity gate.
- Portal quote checkout and balance payment start actions now live in `api/portal/actions.js`, which keeps the deployed function count at 11.

Pre-commit review status:

- A review was requested before commit.
- One high-severity dispatcher crash path was found.
- That issue was fixed by making email-event logging non-blocking in error paths.
- A regression test was added.

## Next Session Start Here

1. Fix the active runtime value for `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` so it is the raw folder id, not the full `drive.google.com` URL.
2. Follow the credential sanity gate in `README.md` before the next commit/push.
3. Run `GET /api/admin/setup-wizard?action=setup` and confirm `storage` passes.
4. Re-run the Stage 7 sandbox path from `README.md`.
5. If Drive passes, continue the remaining Stage 7 checklist items from `docs/roadmap.md`.

## Source Of Truth Rules

- Roadmap status lives in `docs/roadmap.md`.
- Step-by-step implementation truth lives in `docs/execution-log.md`.
- Runtime/operator commands live in `README.md`.
- Architecture language lives in `CONTEXT.md` and `docs/adr/`.

If these disagree, update the stale doc before continuing.

## Suggested Skills For The Next Session

1. `/Users/jewelbait/.claude/skills/productivity/handoff/SKILL.md`
2. `/Users/jewelbait/.claude/skills/engineering/grill-with-docs/SKILL.md`
3. `/Users/jewelbait/.claude/skills/engineering/tdd/SKILL.md`
4. `/Users/jewelbait/.agents/skills/requesting-code-review/SKILL.md`
5. `/Users/jewelbait/.agents/skills/verification-before-completion/SKILL.md`
