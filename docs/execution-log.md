# Execution Log

This file is append-only. Add one entry per implementation step.

## Step 0 - Baseline and Process Setup

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 6 current priority)

### Will Be Done

- Add a required execution-trail process so each step records plan/codebase checks, completed work, and next work.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/superpowers/plans/2026-05-19-v1-usability-testability-contract.md`
- Codebase state: clean `main...origin/main`, HEAD `26bf039`
- Target files/tests: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`

### Done

- Added execution-trail references in `README.md`.
- Added roadmap execution rule in `docs/roadmap.md`.
- Updated `docs/agent-handoff.md` with latest branch state and trail requirement.
- Added `docs/execution-trail.md` protocol.
- Added this `docs/execution-log.md` append-only log.

### Context Check (After)

- Validation run: `git diff --check` (pending current step finalization)
- Codebase delta summary: docs/process updates only

### Needs To Be Done Next

- Use this format for every Stage 6 implementation step.
- Add Step 1 entry before beginning the first Stage 6 code change.

## Step 1 - Follow-Up Selector Logic (Core)

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 6: Add follow-up selector logic)

### Will Be Done

- Add a pure follow-up selector helper that chooses reminder type from project state and staleness, with focused unit tests.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `CONTEXT.md`, `docs/agent-handoff.md`
- Codebase state: dirty docs-only working tree on `main...origin/main`, HEAD `26bf039`
- Target files/tests: new `lib/automation/follow-up-selector.js`, new `test/follow-up-selector.test.js`, update `package.json` `check:js`

### Done

- Added `lib/automation/follow-up-selector.js` with pure selector helpers:
  - `selectFollowUpForProject(project, options)`
  - `selectFollowUps(projects, options)`
- Selector now classifies stale reminder candidates for:
  - `missing_files`
  - `pending_quote`
  - `balance_due`
  - `final_approval`
- Added focused coverage in `test/follow-up-selector.test.js`.
- Added `lib/automation/follow-up-selector.js` to `npm run check:js` in `package.json`.

### Context Check (After)

- Validation run:
  - `node --test test/follow-up-selector.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check` (pass)
- Codebase delta summary:
  - Added `lib/automation/follow-up-selector.js`
  - Added `test/follow-up-selector.test.js`
  - Updated `package.json`

### Needs To Be Done Next

- Add a protected Stage 6 follow-up endpoint and wire it to selector candidates.
- Add duplicate-job prevention and logging surface for follow-up attempts.

## Step 2 - Protected Follow-Up Candidate Route

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 6: Add protected Vercel cron route)

### Will Be Done

- Add a protected cron endpoint that returns follow-up candidates from project state using the new selector logic.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `CONTEXT.md`, `docs/agent-handoff.md`
- Codebase state: dirty with Step 1 and trail docs changes on `main...origin/main`, HEAD `26bf039`
- Target files/tests: `lib/db/studio-records.js`, new `api/cron/follow-ups.js`, new `lib/auth/cron-auth.js`, tests under `test/`

### Done

- Added `lib/auth/cron-auth.js` with shared cron secret validation (`Authorization: Bearer` or `x-cron-secret`).
- Added `getFollowUpCandidates` in `lib/db/studio-records.js`:
  - queries Stage 6-relevant project states from Supabase;
  - returns normalized candidates via `selectFollowUps`.
- Added protected route `api/cron/follow-ups.js`:
  - requires valid cron secret;
  - accepts `GET` and returns candidate preview payload.
- Added focused tests:
  - `test/follow-up-cron-api.test.js`
  - `test/studio-records.test.js` coverage for `getFollowUpCandidates`.
- Updated `package.json` `check:js` for new files.

### Context Check (After)

- Validation run:
  - `node --test test/follow-up-selector.test.js test/follow-up-cron-api.test.js test/studio-records.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check` (pass)
- Codebase delta summary:
  - Added `api/cron/follow-ups.js`
  - Added `lib/auth/cron-auth.js`
  - Updated `lib/db/studio-records.js`
  - Added/updated focused tests and `package.json`

### Needs To Be Done Next

- Add duplicate-job prevention and log each follow-up attempt with status.
- Add reminder dispatch behavior (initially dry-run safe) for missing files, pending quotes, balance due, and final approval.

## Step 3 - Duplicate Prevention and Attempt Logging

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 6: Prevent duplicate pending follow-up jobs + log every attempt)

### Will Be Done

- Add follow-up job queueing that respects unique pending constraints and records success/skip/failure events per attempt.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `CONTEXT.md`
- Codebase state: dirty with Steps 1 and 2 plus execution-trail docs on `main...origin/main`, HEAD `26bf039`
- Target files/tests: `lib/db/studio-records.js`, `api/cron/follow-ups.js`, `test/studio-records.test.js`, `test/follow-up-cron-api.test.js`

### Done

- Added `queueFollowUpJobs` in `lib/db/studio-records.js`:
  - writes pending jobs to `followup_jobs`;
  - skips duplicate pending jobs by handling unique constraint conflicts;
  - returns structured `queued/skipped/failed` results.
- Added per-attempt timeline logging via `project_events`:
  - `followup_job_enqueued`
  - `followup_job_duplicate_skipped`
  - `followup_job_enqueue_failed`
- Extended `api/cron/follow-ups.js` with `dryRun` control:
  - default `dryRun=true` previews candidates;
  - `dryRun=false` queues pending follow-up jobs.
- Added focused tests for queue and cron behaviors.

### Context Check (After)

- Validation run:
  - `node --test test/follow-up-selector.test.js test/follow-up-cron-api.test.js test/studio-records.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check` (pass)
- Codebase delta summary:
  - Updated `lib/db/studio-records.js`
  - Updated `api/cron/follow-ups.js`
  - Updated `test/studio-records.test.js`
  - Updated `test/follow-up-cron-api.test.js`

### Needs To Be Done Next

- Add actual reminder dispatch for each follow-up type (missing files, pending quote, balance due, final approval).
- Mark queued jobs as sent/failed/skipped after dispatch and write email events accordingly.

## Step 4 - Reminder Dispatch and Job Finalization

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 6: Add reminders for each follow-up type)

### Will Be Done

- Dispatch pending follow-up jobs by type, mark each job sent/failed/skipped, and record `email_events` + timeline entries for each attempt.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `CONTEXT.md`
- Codebase state: dirty with Steps 1-3 and docs changes on `main...origin/main`, HEAD `26bf039`
- Target files/tests: new `lib/automation/follow-up-dispatcher.js`, `lib/db/studio-records.js`, `api/cron/follow-ups.js`, tests under `test/`

### Done

- Added `lib/automation/follow-up-dispatcher.js`:
  - dispatches reminders for `missing_files`, `pending_quote`, `balance_due`, and `final_approval`;
  - records sent/failed/skipped outcomes;
  - writes `email_events` and project timeline events per attempt.
- Added follow-up job helpers in `lib/db/studio-records.js`:
  - `listPendingFollowUpJobs`
  - `updateFollowUpJobStatus`
- Extended `api/cron/follow-ups.js`:
  - dry-run candidate preview remains default;
  - `dispatch=true` now processes pending jobs after queueing.
- Added focused tests:
  - `test/follow-up-dispatcher.test.js`
  - updated `test/follow-up-cron-api.test.js`
  - updated `test/studio-records.test.js`
- Ran a pre-commit review request and applied the required fix:
  - made email-event writes non-blocking in dispatcher error paths to avoid cron crash cascades;
  - added regression test for email-event logging failures.

### Context Check (After)

- Validation run:
  - `node --test test/follow-up-selector.test.js test/follow-up-cron-api.test.js test/follow-up-dispatcher.test.js test/studio-records.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check` (pass)
- Codebase delta summary:
  - Added `lib/automation/follow-up-dispatcher.js`
  - Updated `lib/db/studio-records.js`
  - Updated `api/cron/follow-ups.js`
  - Added/updated focused tests and `package.json`

### Needs To Be Done Next

- Add a production-safe cron execution guide in `README.md` including `CRON_SECRET` usage and dry-run/dispatch examples.
- Run end-to-end Stage 6 smoke via `api/cron/follow-ups` in `dryRun=true` then `dryRun=false&dispatch=true`.

## Step 5 - Stage 6 Runtime Smoke Validation

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 6 completion gate before Stage 7)

### Will Be Done

- Run the local Vercel runtime smoke path for Stage 6 follow-up automation and fix any runtime-only defects found in the live cron route/dispatcher path.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `docs/agent-handoff.md`, `README.md`
- Codebase state: dirty with Steps 1-4 plus docs changes on `main...origin/main`, HEAD `26bf039`
- Target files/tests: `lib/db/studio-records.js`, `test/studio-records.test.js`, runtime commands from `README.md`

### Done

- Started `npx vercel dev` with temporary local overrides for missing `CRON_SECRET` and `SITE_URL` values needed for smoke validation.
- Ran live dry-run smoke: `GET /api/cron/follow-ups?dryRun=true`.
- Found a runtime-only Supabase relationship ambiguity in `listPendingFollowUpJobs` caused by `followup_jobs` having multiple relations to `projects`.
- Fixed the pending-job query by qualifying the `projects` embed with `!followup_jobs_project_id_fkey`.
- Added a focused regression test covering the qualified `listPendingFollowUpJobs` select.
- Re-ran live queue+dispatch smoke: `GET /api/cron/follow-ups?dryRun=false&dispatch=true`.

### Context Check (After)

- Validation run:
  - direct pending-job query against configured Supabase (`pendingCount: 0`) (pass)

  ## Step 21 - Runtime Fingerprint For Preview Drift Checks

  Date/Time: 2026-05-20
  Owner: GitHub Copilot + Josh
  Roadmap link: `docs/roadmap.md` (Stage 7: verify real sandbox webhook and automation round-trip)

  ### Will Be Done
  - Add a shared non-secret runtime fingerprint to the setup wizard and local env audit so deployed preview configuration can be compared against the active local preview profile without printing secrets.

  ### Context Check (Before)
  - Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `README.md`, `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`
  - Codebase state: dirty `main` worktree after preview checkout, webhook, and deliverability investigation; latest pushed commit must still be confirmed from git when needed
  - Target files/tests: `lib/automation/setup-checks.js`, `scripts/check-env-parity.js`, new `lib/env/runtime-fingerprint.js`, `test/setup-checks.test.js`, `test/admin-setup-api.test.js`

  ### Done
  - Added `lib/env/runtime-fingerprint.js` to summarize the active runtime without exposing secrets.
  - Updated `lib/automation/setup-checks.js` so `GET /api/admin/setup-wizard?action=setup` now returns a `runtimeFingerprint` alongside section readiness.
  - Updated `scripts/check-env-parity.js` so the local env audit prints the same runtime fingerprint after parity checks.
  - Added focused coverage in `test/setup-checks.test.js` and `test/admin-setup-api.test.js`.
  - Updated `README.md`, `docs/roadmap.md`, and `docs/agent-handoff.md` so the intended preview drift check is now: deployed setup fingerprint versus `npm run check:env:preview`.

  ### Context Check (After)
  - Validation run:
    - `node --test test/setup-checks.test.js test/admin-setup-api.test.js` (pass)
    - `npm run check:env:preview` (pass)
  - Codebase delta summary:
    - Added `lib/env/runtime-fingerprint.js`
    - Updated `lib/automation/setup-checks.js`
    - Updated `scripts/check-env-parity.js`
    - Updated focused tests and Stage 7 workflow docs

  ### Needs To Be Done Next
  - Read the deployed preview setup report and compare its runtime fingerprint against the local preview profile before the next webhook or email debugging step.
  - If the fingerprint differs, fix preview env drift before rerunning checkout.
  - If the fingerprint matches, continue with the real webhook/automation round-trip verification using the active preview deployment.
  - `curl -sS "http://localhost:3000/api/cron/follow-ups?dryRun=true" -H "authorization: Bearer $CRON_SECRET"` (pass, `count: 0`)
  - `curl -sS "http://localhost:3000/api/cron/follow-ups?dryRun=false&dispatch=true" -H "authorization: Bearer $CRON_SECRET"` (pass, `scannedCount: 0`)
  - `node --test test/follow-up-dispatcher.test.js test/follow-up-cron-api.test.js test/studio-records.test.js` (pass)

- Codebase delta summary:
  - Updated `lib/db/studio-records.js`
  - Updated `test/studio-records.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Review the final Stage 6 worktree once more, then commit and push.
- Begin Stage 7 launch hardening from `docs/roadmap.md`.

## Step 6 - Stage 7 Provider Readiness And Sandbox Gate

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Run the admin sandbox test against real providers)

### Will Be Done

- Verify whether the local environment is ready for the Stage 7 admin sandbox run, then run the setup endpoint and sandbox test path against the local Vercel runtime to capture real blockers or pass evidence.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `README.md`, `docs/agent-handoff.md`
- Codebase state: clean `main...origin/main`, HEAD `85dddab`
- Target files/tests: `docs/execution-log.md`, runtime commands from `README.md`, `api/admin/setup-wizard.js`, `lib/automation/setup-checks.js`, `lib/automation/test-mode-runner.js`

### Done

- Confirmed Stage 7 starts from clean `main` at `85dddab`.
- Applied process skills before execution: `using-superpowers`, `executing-plans`, and `verification-before-completion`.
- Ran the live admin setup endpoint through local `vercel dev`.
- Ran a deterministic sandbox run: `sandbox-20260519T160000-stage7a`.
- Confirmed the sandbox currently fails in the free-review workflow because Drive folders are not created.
- Queried the recorded `drive_failed` project event from Supabase and captured the concrete provider error.
- Added a real Google Drive access probe to `runSetupChecks` so Stage 7 setup now fails early instead of reporting a false pass.
- Added focused tests for the Drive access probe and setup-check wiring.
- Verified the actual storage blocker: the configured `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` value is a full Drive URL in the runtime environment, but the app expects the raw folder id.
- Updated docs to clarify that `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` must be the raw folder id.

### Context Check (After)

- Validation run:
  - `curl -sS "http://localhost:3000/api/admin/setup-wizard?action=setup"` before fix (pass but misleading)
  - `curl -sS -X POST "http://localhost:3000/api/admin/setup-wizard?action=test-runs" ...` with `testRunId=sandbox-20260519T160000-stage7a` (fail: `Sandbox free review did not create all required Drive folders.`)
  - direct Supabase `project_events` query for `event_type=drive_failed` (captured `Unable to search Google Drive folders: File not found: ...`)
  - `node --test test/google-drive.test.js test/setup-checks.test.js` (pass)
  - `curl -sS "http://localhost:3000/api/admin/setup-wizard?action=setup"` after fix (expected fail in `storage` with explicit Drive folder access error)
- Codebase delta summary:
  - Updated `lib/google/drive.js`
  - Updated `lib/automation/setup-checks.js`
  - Updated `test/google-drive.test.js`
  - Updated `test/setup-checks.test.js`
  - Updated `README.md`
  - Updated `.env.example`
  - Updated `docs/execution-log.md`
  - Updated `docs/agent-handoff.md`

### Needs To Be Done Next

- Fix the `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` value in the active runtime environment so it is the raw folder id, not the full Drive URL.
- Re-run `GET /api/admin/setup-wizard?action=setup` and confirm `storage` passes.
- Re-run the deterministic sandbox path for `sandbox-20260519T160000-stage7a` or a fresh Stage 7 test run after the Drive config is corrected.

## Step 7 - Credential Workflow And Commit Gate Documentation

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: harden the operator workflow around runtime credentials)

### Will Be Done

- Add a permanent credential checklist and pre-commit/pre-push workflow guardrail to the repo docs, including explicit instructions for extracting the raw Google Drive folder id.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `README.md`, `docs/deployment-preflight.md`, `docs/agent-handoff.md`
- Codebase state: dirty with uncommitted Stage 7 setup-check hardening and docs updates on `main...origin/main`, HEAD `85dddab`
- Target files/tests: `README.md`, `.env.example`, `docs/deployment-preflight.md`, `docs/execution-trail.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`

### Done

- Added a permanent credential todo list to `README.md` covering the required `.env.local` / Vercel provider values.
- Added explicit raw Google Drive folder id extraction instructions, including correct and incorrect examples.
- Added a required `Before Every Commit And Push` runtime credential gate to `README.md`.
- Added the same credential/provider gate to `docs/deployment-preflight.md` and `docs/execution-trail.md` so it is part of the documented workflow, not just setup notes.
- Clarified `.env.example` so `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` shows the raw-id-only rule next to the variable.
- Updated `docs/roadmap.md` and `docs/agent-handoff.md` so the permanent credential sanity constraint is visible in the repo state docs.

### Context Check (After)

- Validation run:
  - `git diff --check` (pass)
  - spot-check reads for `README.md`, `.env.example`, `docs/deployment-preflight.md`, and `docs/execution-trail.md` (pass)
- Codebase delta summary:
  - Updated `README.md`
  - Updated `.env.example`
  - Updated `docs/deployment-preflight.md`
  - Updated `docs/execution-trail.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Fix the active runtime value for `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` so it is the raw folder id.
- Re-run the Stage 7 setup and sandbox checks using the new credential sanity gate before the next commit/push.

---

## Step 8 - Enforce Vercel Function Guardrail

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Deployment Guardrail)

### Will Be Done

- Remove the extra deployable portal functions and make `git push` fail locally unless deploy preflight passes.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `README.md`, `docs/deployment-preflight.md`, `docs/execution-trail.md`, `docs/agent-handoff.md`
- Codebase state: Vercel production deploys failing on `main` because Hobby only allows 12 serverless functions and the repo had 13 deployable files under `api/`
- Target files/tests: `api/portal/actions.js`, `portal.js`, `test/portal-actions.test.js`, `test/portal-accept-quote-api.test.js`, `test/portal-balance-payment-api.test.js`, `package.json`, `.husky/pre-push`, `README.md`, `docs/deployment-preflight.md`, `docs/execution-trail.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`

### Done

- Consolidated portal quote checkout and balance checkout starts into `api/portal/actions.js`.
- Removed `api/portal/accept-quote.js` and `api/portal/pay-balance.js` so the deployed function count dropped to 11.
- Updated the portal client and focused API tests to use `api/portal/actions.js` for both payment starts.
- Added `.husky/pre-push` so every normal `git push` runs `npm run deploy:preflight` locally before Vercel sees the commit.
- Updated repo workflow docs and handoff notes to reflect the enforced push rule and the current consolidated route shape.

### Context Check (After)

- Validation run:
  - `node --test test/portal-actions.test.js test/portal-accept-quote-api.test.js test/portal-balance-payment-api.test.js` (pass)
  - `node scripts/check-vercel-function-limit.js` (pass: `11/12`)
- Codebase delta summary:
  - Updated `api/portal/actions.js`
  - Updated `portal.js`
  - Updated `test/portal-accept-quote-api.test.js`
  - Updated `test/portal-balance-payment-api.test.js`
  - Updated `package.json`
  - Added `.husky/pre-push`
  - Updated `README.md`
  - Updated `docs/deployment-preflight.md`
  - Updated `docs/execution-trail.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Fix the active runtime value for `GOOGLE_DRIVE_PROJECTS_FOLDER_ID` so the Stage 7 provider checks can pass.
- Re-run the Stage 7 setup and sandbox checks after the credential fix.

---

## Step 9 - Synchronize Post-Push Project State Docs

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: launch hardening)

### Will Be Done

- Update the main repo docs so the next agent sees the real pushed state, the end-product goal, and the remaining Stage 7 work.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `README.md`, `docs/execution-log.md`, `CONTEXT.md`
- Codebase state: clean `main...origin/main` at `3162aa2`, but handoff/roadmap text still describes the pre-fix Drive blocker and pre-push repo state
- Target files/tests: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`

### Done

- Added a concise end-product goal and current-status snapshot to `README.md`.
- Updated `docs/roadmap.md` so Stage 7 reflects the current reality: local setup gate passes and the remaining work is provider verification plus launch-checklist completion.
- Updated `docs/agent-handoff.md` so it now reflects the pushed commit, clean repo state, current validation evidence, and the correct next actions.
- Logged this synchronization step in `docs/execution-log.md` so the documentation trail matches the shipped repo state.

### Context Check (After)

- Validation run:
  - spot-check reads for `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and `docs/execution-log.md` (pass)
  - `git diff --check` (pass)
- Codebase delta summary:
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Run the Stage 7 real-provider sandbox flow from `README.md` and record the results.
- Convert those results into completed or narrowed-down Stage 7 checklist items.

---

## Step N - <short title>

Date/Time:
Owner:
Roadmap link:

### Will Be Done

- <single bounded implementation objective>

### Context Check (Before)

- Plan docs reviewed: <files>
- Codebase state: <git status summary>
- Target files/tests: <files>

### Done

- <concrete changes completed>

### Context Check (After)

- Validation run: <commands + result>
- Codebase delta summary: <files changed>

### Needs To Be Done Next

- <next immediate bounded step>
- <risks/blockers if any>

---

## Step 10 - Re-Run Stage 7 Provider Sandbox Flow

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Run the admin sandbox test against real providers)

### Will Be Done

- Re-run the Stage 7 setup endpoint and deterministic `v1-usability` sandbox flow against the local Vercel runtime, then capture whether the real-provider path now passes or which provider still fails.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `README.md`, `docs/agent-handoff.md`, `CONTEXT.md`
- Codebase state: dirty `main...origin/main` at `3162aa2` with local updates in `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and `docs/execution-log.md`
- Target files/tests: `docs/execution-log.md`, runtime commands from `README.md`, `api/admin/setup-wizard.js`, `lib/automation/test-mode-runner.js`

### Done

- Re-ran `GET /api/admin/setup-wizard?action=setup` against local `vercel dev` and confirmed the setup gate now passes, including the live Google Drive probe.
- Ran the deterministic `v1-usability` sandbox scenario with `testRunId=sandbox-20260519T112619-stage7b`.
- Confirmed the sandbox now fails in the email provider path, not the Drive path.
- Captured the persisted sandbox report and the concrete provider error: Resend rejects the configured sender because the `gmail.com` domain is not verified.

### Context Check (After)

- Validation run:
  - `git status -sb && git log -1 --oneline --decorate` (dirty docs on `main...origin/main`, HEAD `3162aa2`)
  - `npx vercel dev` (pass, local runtime ready)
  - `curl -sS "http://localhost:3000/api/admin/setup-wizard?action=setup"` (pass, `storage` provider passed)
  - `curl -sS -X POST "http://localhost:3000/api/admin/setup-wizard?action=test-runs" ...` with `testRunId=sandbox-20260519T112619-stage7b` (fail: `Sandbox free review email failed: Resend email failed: The gmail.com domain is not verified.`)
  - `curl -sS "http://localhost:3000/api/admin/setup-wizard?action=test-runs&testRunId=sandbox-20260519T112619-stage7b"` (pass, persisted report fetched)
- Codebase delta summary:
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Make the setup-check email section fail early when `RESEND_FROM_EMAIL` is not on a sending-ready Resend domain.
- Re-run `GET /api/admin/setup-wizard?action=setup` and confirm the email provider failure is explicit before the next sandbox attempt.

---

## Step 11 - Add Early Resend Sender Verification

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Verify Resend sender domain, reply-to, and deliverability)

### Will Be Done

- Add a live Resend sender-domain check to the setup gate so Stage 7 email misconfiguration fails early with an explicit provider error instead of surfacing only during sandbox runs.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `README.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: dirty `main...origin/main` at `3162aa2` with local updates in `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and `docs/execution-log.md`
- Target files/tests: `lib/email/resend.js`, `lib/automation/setup-checks.js`, `test/resend-email.test.js`, `test/setup-checks.test.js`, `README.md`, `docs/execution-log.md`

### Done

- Added `verifyResendSender` in `lib/email/resend.js` so setup checks fail early when `RESEND_FROM_EMAIL` is a public inbox domain like `gmail.com`.
- Wired the setup email section in `lib/automation/setup-checks.js` through the new Resend sender validation.
- Added focused coverage in `test/resend-email.test.js` and `test/setup-checks.test.js` for the new setup-gate behavior.
- Updated `README.md` so the Resend setup requirement is explicit: `RESEND_FROM_EMAIL` must use a domain controlled in Resend and configured for both send and receive.
- Verified that the live setup endpoint now fails early and explicitly on the current runtime Resend misconfiguration instead of waiting for the sandbox run to fail.

### Context Check (After)

- Validation run:
  - `node --test test/resend-email.test.js test/setup-checks.test.js` (pass)
  - `curl -sS "http://localhost:3000/api/admin/setup-wizard?action=setup"` (fail as expected in `email`: `RESEND_FROM_EMAIL must use a domain you control in Resend with send and receive configured; public inbox domains like gmail.com are not valid senders.`)
- Codebase delta summary:
  - Updated `lib/email/resend.js`
  - Updated `lib/automation/setup-checks.js`
  - Updated `test/resend-email.test.js`
  - Updated `test/setup-checks.test.js`
  - Updated `README.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Change the active runtime `RESEND_FROM_EMAIL` to a custom domain configured in Resend for both send and receive.
- Re-run `GET /api/admin/setup-wizard?action=setup` and the Stage 7 sandbox flow after the Resend sender is fixed.

---

## Step 12 - Switch Local Resend Sender To Studio Domain

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Verify Resend sender domain, reply-to, and deliverability)

### Will Be Done

- Update the local runtime Resend sender from the Gmail inbox to the intended Dirt Cat Records studio address, then re-run the setup gate and Stage 7 sandbox flow to capture the next real-provider result.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `README.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: dirty `main...origin/main` at `3162aa2` with local Stage 7 setup-gate hardening and docs updates in progress
- Target files/tests: `.env.local`, runtime commands from `README.md`, `docs/execution-log.md`

### Done

- Updated `.env.local` so the local runtime uses `Dirt Cat Records <studio@dirtcatrecords.com>` as the Resend sender and `studio@dirtcatrecords.com` as the reply-to address.
- Re-ran `GET /api/admin/setup-wizard?action=setup` and confirmed the setup gate now passes again with the local custom Resend domain.
- Ran the deterministic Stage 7 sandbox flow with `testRunId=sandbox-20260519T113900-stage7c` and confirmed the full `v1-usability` scenario passes end to end.
- Captured evidence that the successful sandbox run exercised Supabase writes, Google Drive folder creation, Resend-backed workflow email acceptance, and sandbox-like PayPal payment events.
- Cleaned up the same sandbox run after verification so the test artifacts were not left behind.

### Context Check (After)

- Validation run:
  - `curl -sS "http://localhost:3000/api/admin/setup-wizard?action=setup"` before sender update (fail in `email` on Gmail sender)
  - `curl -sS "http://localhost:3000/api/admin/setup-wizard?action=setup"` after sender update (pass)
  - `curl -sS -X POST "http://localhost:3000/api/admin/setup-wizard?action=test-runs" ...` with `testRunId=sandbox-20260519T113900-stage7c` (pass, full `v1-usability` scenario)
  - `curl -sS -X POST "http://localhost:3000/api/admin/setup-wizard?action=cleanup" ...` with `testRunId=sandbox-20260519T113900-stage7c` (pass, `cleanupStatus: cleaned`)
- Codebase delta summary:
  - Updated `.env.local`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Update repo status docs so Stage 7 reflects the now-passing local sandbox run.
- Verify the remaining launch-hardening items that were not proven by the local sandbox run: production magic-link redirect behavior, production env parity, and any final checklist documentation.

---

## Step 13 - Audit Vercel Environment Parity

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Verify Vercel environment variables are set for production)

### Will Be Done

- Audit the configured Vercel production and preview environment variable names so Stage 7 can distinguish between local validation success and actual deploy readiness.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/execution-trail.md`, `README.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: dirty `main...origin/main` at `3162aa2` with local Stage 7 setup-gate hardening, local env change, and docs updates in progress
- Target files/tests: Vercel CLI environment listings, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`

### Done

- Listed the configured Vercel production environment variable names.
- Listed the configured Vercel preview environment variable names.
- Confirmed the redeployed production env now includes the required site/admin, Resend, Google Drive, cron, PayPal, and Supabase variable names for the documented runtime.
- Confirmed preview now includes the added site/admin, Resend, Google Drive, and cron names, but is still missing key server/runtime values including `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and PayPal vars.
- Ran production-safe runtime smokes on the canonical `www` host: public pages return `200`, `GET /api/checkout-config` returns valid public config JSON, and the admin setup route returns `401` as expected without admin auth.

### Context Check (After)

- Validation run:
  - `npx vercel env ls production` (pass, names listed)
  - `npx vercel env ls preview` (pass, names listed)
- Codebase delta summary:
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Verify production magic-link redirects on the canonical domain.
- Verify real-provider behavior that the local sandbox path does not fully prove: PayPal browser/webhook flow, Drive sharing permissions, and Resend deliverability.
- Fill the still-missing preview server/runtime values so preview can use sandbox PayPal safely.

---

## Step 14 - Split Preview PayPal Runtime And Validate Sandbox Browser Flow

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Verify PayPal sandbox checkout and webhook)

### Will Be Done

- Separate preview and production PayPal runtime values in Vercel, deploy a preview build, and verify the deployed preview checkout reaches sandbox PayPal instead of live PayPal.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `README.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: clean `main...origin/main` at `fb74cb0`, but Vercel preview configuration and docs still reflected an incomplete preview PayPal setup
- Target files/tests: Vercel env listings, Vercel preview deployments, preview browser checks, `docs/execution-log.md`

### Done

- Verified that preview and production now use separate `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, and `PAYPAL_WEBHOOK_ID` values in Vercel.
- Created a new preview deployment and identified the latest preview URL.
- Verified the deployed preview portal and admin pages load.
- Verified the deployed preview checkout renders PayPal and reaches PayPal sandbox from the hosted checkout step.
- Confirmed the hosted preview PayPal flow exposes `env=sandbox` and routes into `www.sandbox.paypal.com`.

### Context Check (After)

- Validation run:
  - `npx vercel env ls preview` (pass, preview PayPal vars separated)
  - `npx vercel env ls production` (pass, production PayPal vars separated)
  - `npx vercel ls --yes | head -n 25` (pass, preview deployment identified)
  - Browser validation on the latest preview deployment (pass, checkout reaches PayPal sandbox)
- Codebase delta summary:
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Make the preview deployment publicly reachable so PayPal sandbox webhooks can hit the preview webhook endpoint.
- Run one full sandbox payment and confirm the webhook round-trip.

---

## Step 15 - Temporarily Disable Preview Protection For Webhook Testing

Date/Time: 2026-05-19
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Verify PayPal sandbox checkout and webhook)

### Will Be Done

- Temporarily disable Vercel Authentication so the preview deployment is reachable by PayPal sandbox webhook delivery, then verify the preview pages and webhook route respond without browser-auth cookies.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `README.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: clean `main...origin/main` at `fb74cb0`, preview browser flow verified against sandbox PayPal, but preview was still protected by Vercel Authentication for unauthenticated callers
- Target files/tests: Vercel project protection settings, latest preview deployment URL, non-browser HTTP reachability checks, `docs/execution-log.md`

### Done

- Queried the linked Vercel project settings and confirmed deployment protection was still active.
- Patched the Vercel project to set `ssoProtection` to `null`, temporarily disabling Vercel Authentication.
- Confirmed the latest preview deployment is now reachable without browser auth.
- Confirmed unauthenticated HTTP checks hit the real preview app and webhook route instead of the Vercel login wall.
- Left preview public intentionally so the next session can run a full sandbox payment and webhook test.

### Context Check (After)

- Validation run:
  - `npx vercel api /v10/projects/prj_A6POqolK5I68ypAUtOaRRu82VzNp --raw | node -e '...'` (pass, `ssoProtection` is `null`)
  - `curl -I -s https://dirt-cat-records-pvh5lrqj6-dirt-cat-records-projects.vercel.app/checkout.html` (pass, `200`)
  - `curl -s -o /dev/null -w '%{http_code}\n' -X POST https://dirt-cat-records-pvh5lrqj6-dirt-cat-records-projects.vercel.app/api/webhooks/paypal` (pass, `400`, confirming app reachability)
- Codebase delta summary:
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Run one full sandbox payment on the public preview deployment and confirm the webhook event is accepted and processed.
- Re-enable Vercel Authentication after webhook validation is complete.

---

## Step 16 - Add Repo-Native VS Code And GitHub Workflow Surfaces

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 0: Stabilize The Source Of Truth, Deployment Guardrail)

### Will Be Done

- Add workspace-level VS Code settings, tasks, and extension recommendations that match the installed tool stack, and add a GitHub Actions workflow that runs the same deploy preflight guardrail used locally.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `README.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: feature/runtime work is centered on Stage 7 sandbox verification, but the repo still had no `.vscode/` workspace config and no `.github/workflows/` CI surface for the installed GitHub extensions
- Target files/tests: `.vscode/`, `.github/workflows/`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`

### Done

- Added `.vscode/settings.json` to enable repo-scoped Prettier formatting and keep GitHub PR / Actions aligned to the `origin` remote.
- Added `.vscode/tasks.json` so the common repo commands run directly from the VS Code task runner.
- Added `.vscode/extensions.json` with the recommended Vercel, PayPal, Supabase, GitHub PR, GitHub Actions, and Prettier extensions.
- Added `.github/workflows/ci.yml` so GitHub Actions runs `npm run deploy:preflight` on pull requests and pushes to `main`.
- Documented the new editor/CI workflow surfaces in `README.md`, `docs/roadmap.md`, and `docs/agent-handoff.md`.

### Context Check (After)

- Validation run:
  - `get_errors` on `.vscode/settings.json`, `.vscode/extensions.json`, `.vscode/tasks.json`, `.github/workflows/ci.yml`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and `docs/execution-log.md` (pass, no errors)
  - `git diff --check` (pass)
- Codebase delta summary:
  - Added `.github/workflows/ci.yml`
  - Added `.vscode/settings.json`
  - Added `.vscode/tasks.json`
  - Added `.vscode/extensions.json`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Run focused validation on the new JSON/YAML workspace files and confirm the repo still passes diff hygiene.
- Push the workflow/tooling change set if it should be shared across future sessions and clones.

---

## Step 17 - Refine Recommendations For Newly Added VS Code Extensions

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 0: Stabilize The Source Of Truth)

### Will Be Done

- Re-check the newly installed VS Code extensions, keep the repo-native wins, and document which ones are useful here versus merely installed locally.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `README.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: `.vscode/` recommendations already covered the first extension batch, but Josh added more extensions and the repo still needed a clearer distinction between tools that help this codebase directly and tools that are just editor-local preferences
- Target files/tests: `.vscode/extensions.json`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`
- Discriminating checks: confirm whether the repo has matching ESLint, Docker, or Tailwind surfaces before recommending those as repo defaults; confirm whether the repo already relies on repeated HTTP endpoint checks that would justify Thunder Client

### Done

- Kept GitLens and Thunder Client as repo-native recommendations because they directly support history inspection and repeatable API smoke/testing paths already documented in `README.md`.
- Documented that Live Server is not authoritative for this project because runtime validation depends on Vercel Functions.
- Documented that Tailwind, Docker/Dev Containers, and ESLint do not yet have matching repo surfaces, so they were not promoted as repo-native workflow defaults.
- Documented that Error Lens, Todo Tree, Console Ninja, and icon packs remain optional personal productivity tools rather than shared repo requirements.

### Context Check (After)

- Validation run:
  - `get_errors` on `.vscode/extensions.json`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and `docs/execution-log.md` (pass, no errors)
  - `git diff --check && git status -sb` (pass for diff hygiene; worktree shows the expected `.vscode/`, `.github/`, and docs changes)
- Codebase delta summary:
  - Updated `.vscode/extensions.json`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Run focused validation on the docs and recommendation file updates.
- Push the workflow/tooling changes if the shared editor workflow should become the new default for future clones.

---

## Step 18 - Add Dedicated Paid-Customer Project Support Flow

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 1: Replace The Manual Paid Intake Flow)

### Will Be Done

- Replace the success-page fallback contact behavior with a dedicated paid-customer support flow that feels post-purchase and operational, not like a pre-sales lead form.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `README.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: dirty `main...origin/main` at `668c7dc` with unpushed PayPal capture fixes already in progress; success-page contact behavior still sent customers into the wrong surface
- Target files/tests: `success.html`, `style.css`, `package.json`, new `support.html`, new `support.js`, new `api/public/project-support.js`, `test/success-page.test.js`, new support tests

### Done

- Replaced the paid-success secondary CTA with a dedicated `support.html` destination and updated the surrounding success-page copy so it speaks to post-payment help instead of generic site contact.
- Added `support.html` as a dedicated paid-customer support page using the existing checkout layout language.
- Added `support.js` to prefill support fields from `sessionStorage.dirtCatPaidOrder`, render recent payment context, and submit support requests to a dedicated public route.
- Added `api/public/project-support.js` with validation, honeypot protection, rate limiting, and structured support-email delivery to `ADMIN_EMAIL` via the existing Resend path.
- Added focused tests for the success-page contract, the dedicated support page, and the support API route.
- Updated `package.json` and `style.css` for the new page/script/route.
- Deployed preview `https://dirt-cat-records-gtx14oyqe-dirt-cat-records-projects.vercel.app` and confirmed the hosted success page links to the dedicated support page and the support page serves the expected form.

### Context Check (After)

- Validation run:
  - `node --test test/success-page.test.js test/project-support-page.test.js test/project-support-api.test.js` (pass)
  - `npm run check:js` (pass)
  - `node scripts/check-vercel-function-limit.js` (pass, `12/12`)
  - `git diff --check` (pass)
  - `npx vercel --yes` (pass, preview `https://dirt-cat-records-gtx14oyqe-dirt-cat-records-projects.vercel.app`)
  - `curl -sS https://dirt-cat-records-gtx14oyqe-dirt-cat-records-projects.vercel.app/support.html | grep -n 'Need Help With Your Project\|project-support-form\|support.js'` (pass)
- Codebase delta summary:
  - Updated `success.html`
  - Updated `style.css`
  - Updated `package.json`
  - Added `support.html`
  - Added `support.js`
  - Added `api/public/project-support.js`
  - Updated `test/success-page.test.js`
  - Added `test/project-support-page.test.js`
  - Added `test/project-support-api.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Run one real preview support submission if Josh wants to verify the email body and reply workflow end to end.
- Confirm the PayPal sandbox webhook/automation round-trip for the already-successful preview checkout before pushing the combined PayPal/support changes.

---

## Step 19 - Add Ordered PayPal Environment Deepening Plan And Resync Status Docs

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Live Launch Hardening)

### Will Be Done

- Create one executable plan for the remaining PayPal environment/webhook deepening work, choose the execution order that keeps diagnosis separate from refactor work, and resync the main status docs to the current clean repo state.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `README.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-19-stage-7-launch-verification.md`
- Skills reviewed before action: `using-superpowers`, `writing-plans`, `executing-plans`
- Codebase state: clean `main...origin/main` at `27aabae`, no uncommitted changes, no local-only commits on `main`
- Target files/tests: new `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`
- Discriminating checks: confirm whether the repo itself is dirty or divergent before changing docs; confirm whether the stale preview problem is runtime code or documentation/history

### Done

- Created `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md` as the ordered implementation plan for the remaining PayPal environment/webhook seams.
- Chose the execution order to keep the current external sandbox webhook truth gap separate from code refactors: real webhook proof first, then environment config, webhook identity, readiness, runtime lifecycle, and payment-purpose routing context.
- Updated `README.md` so the current source-of-truth view reflects the clean `27aabae` repo state and points to the new ordered plan.
- Updated `docs/roadmap.md` so Stage 7 explicitly tracks the current external webhook verification step and the ordered architecture follow-on work.
- Updated `docs/agent-handoff.md` to remove stale claims about unpushed local changes, record the clean aligned repo state, and point the next session at the new plan and exact next action.
- Recorded that the stale preview URLs found so far are documentation/history only, not active runtime configuration.

### Context Check (After)

- Validation run:
  - `get_errors` on `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, and `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
  - `git diff --check`
- Codebase delta summary:
  - Added `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Use PayPal Developer and the preview Vercel configuration to confirm the active sandbox webhook URL/id/events against the public preview deployment.
- Run one real preview sandbox checkout and capture a clear webhook pass/fail record before starting any PayPal refactor task from the new plan.

---

## Step 20 - Fix Preview Capture Failure When PayPal Order Read Omits Metadata

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Verify PayPal sandbox checkout and webhook end to end)

### Will Be Done

- Reproduce the browser-side `PayPal order is missing checkout metadata.` failure at the capture-route seam, fix the narrow restore path, and lock the behavior down with a focused regression test.

### Context Check (Before)

---

## Step 22 - Repoint Stable Preview Alias To The Active Webhook Test Deployment

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Verify PayPal sandbox checkout and webhook end to end)

### Will Be Done

- Identify why the latest real sandbox checkout reached `success.html` without any matching preview Supabase side effects, then correct the preview routing seam if checkout and webhook delivery are hitting different deployments.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: dirty `main` worktree with the already-landed preview-origin fix; no new source edits made in this step
- Target files/tests: Vercel preview deployments, Vercel alias mappings, preview runtime logs, PayPal webhook target behavior, status docs
- Discriminating checks: confirm whether the latest checkout and webhook requests hit the same deployment; confirm whether the stable alias serving the PayPal webhook target matches the active browser-checkout deployment

### Done

- Queried the fresh diagnostic deployment logs and confirmed the latest sandbox checkout hit the current preview deployment with `POST /api/create-paypal-order 200`, `POST /api/capture-paypal-order 200`, and `GET /success.html 200`.
- Queried the stable preview alias logs and confirmed PayPal webhook delivery was landing there instead, with one `POST /api/webhooks/paypal 200` followed by repeated `400` retries.
- Fetched `GET /api/checkout-config` from both hosts and confirmed the stable preview alias was serving an older build shape that did not expose the newer `publicAppOrigin` and `runtimeFingerprint` fields, while the fresh diagnostic deployment did.
- Ran `npx vercel alias ls` and confirmed the stable preview alias was still pinned to an older preview deployment instead of the deployment used for browser checkout.
- Repointed the stable preview alias to the active diagnostic deployment with `npx vercel alias set ...`.
- Verified the repointed stable alias now serves the current public config shape again, including `publicAppOrigin` and `runtimeFingerprint`.
- Updated `README.md`, `docs/roadmap.md`, and `docs/agent-handoff.md` so the stable-alias requirement is now documented as part of the preview webhook-testing workflow.

### Context Check (After)

- Validation run:
  - `npx vercel logs https://dirt-cat-records-nrepl9dir-dirt-cat-records-projects.vercel.app --since 1h`
  - `npx vercel logs https://dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app --since 1h`
  - `curl -sS https://dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app/api/checkout-config`
  - `curl -sS https://dirt-cat-records-nrepl9dir-dirt-cat-records-projects.vercel.app/api/checkout-config`
  - `npx vercel alias ls`
  - `npx vercel alias set dirt-cat-records-nrepl9dir-dirt-cat-records-projects.vercel.app dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app`
- Codebase delta summary:
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Run one more real preview sandbox checkout or resend the latest PayPal webhook event now that the stable preview alias and browser-checkout deployment are the same build.
- Confirm that `/api/webhooks/paypal` both returns success and produces the expected Supabase, Drive, and Resend side effects before closing the Stage 7 webhook gap.

---

## Step 23 - Fix Preview Webhook Parsing For Real Sandbox Event Shapes

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Verify PayPal sandbox checkout and webhook end to end)

### Will Be Done

- Confirm why preview webhook delivery still produced no side effects after the alias fix, then patch the webhook parser only after the exact live PayPal event mismatch is proven.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: dirty `main` worktree with the preview-origin and alias-routing fixes already applied
- Target files/tests: `lib/paypal/webhook.js`, `api/webhooks/paypal.js`, `test/paypal-webhook.test.js`, PayPal sandbox webhook config and event payloads, Vercel preview deployment
- Discriminating checks: identify the actual sandbox event types delivered for checkout, confirm whether the live payloads match the parser assumptions, and verify whether a resend against a fixed deployment creates preview-side records

### Done

- Queried the configured PayPal sandbox webhook directly via the PayPal API and confirmed the webhook id `5AP132285X728093B` points to `https://dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app/api/webhooks/paypal`.
- Queried recent sandbox webhook event payloads directly via the PayPal API and confirmed the real checkout flow emits only `CHECKOUT.ORDER.APPROVED` and `PAYMENT.CAPTURE.COMPLETED` events for the recent preview runs.
- Confirmed that the live `PAYMENT.CAPTURE.COMPLETED` payload includes `custom_id` and `related_ids.order_id` but omits buyer email, while the live `CHECKOUT.ORDER.APPROVED` payload contains buyer email and completed capture details.
- Reproduced the mismatch locally by running the exact recent live payloads through the parser:
  - `PAYMENT.CAPTURE.COMPLETED` threw `Completed PayPal event is missing a buyer email.`
  - `CHECKOUT.ORDER.APPROVED` returned `null` because the parser only handled `CHECKOUT.ORDER.COMPLETED`
- Updated `lib/paypal/webhook.js` so the webhook parser now accepts `CHECKOUT.ORDER.APPROVED` and hydrates `PAYMENT.CAPTURE.COMPLETED` from the related PayPal order when buyer email is missing.
- Updated `api/webhooks/paypal.js` to use the new async webhook parser.
- Added focused tests that cover approved-order parsing and capture-event order hydration.
- Validated the fix with `node --test test/paypal-webhook.test.js test/paypal-webhook-route.test.js`, `npm run check:js`, and `git diff --check`.
- Deployed preview `https://dirt-cat-records-fbw22jdf7-dirt-cat-records-projects.vercel.app`, repointed the stable alias to that deployment, and resent the exact recent live PayPal events through the PayPal API.
- Confirmed the resend created preview-side `orders`, `payments`, `projects`, `project_events`, and `email_events`, closing the Stage 7 webhook truth gap.
- Confirmed the remaining sandbox-only workflow failure is Drive sharing to the PayPal sandbox buyer address, which is not a Google account.

### Context Check (After)

- Validation run:
  - `node --test test/paypal-webhook.test.js test/paypal-webhook-route.test.js`
  - `npm run check:js`
  - `git diff --check`
  - `npx vercel --yes`
  - `npx vercel alias set dirt-cat-records-fbw22jdf7-dirt-cat-records-projects.vercel.app dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app`
  - PayPal API resend of `WH-1BJ40637T0570784J-67409297PU940703S` and `WH-66207504J0697364Y-60A80641VL295021G`
  - direct preview Supabase queries confirming created `payments`, `orders`, `projects`, `email_events`, and `project_events`
- Codebase delta summary:
  - Updated `lib/paypal/webhook.js`
  - Updated `api/webhooks/paypal.js`
  - Updated `test/paypal-webhook.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Verify production-domain magic-link behavior now that the preview webhook gap is closed.
- Restore Vercel Authentication after preview webhook testing is complete.

---

## Step 24 - Verify Preview Drive Sharing With Sandbox Override Account

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Verify Google Drive folder creation and sharing permissions)

### Will Be Done

- Close the remaining preview verification gap by proving Google Drive folder creation and upload-folder sharing on preview, even though the PayPal sandbox buyer email is not a real Google account.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: dirty `main` worktree with the webhook parser fix already deployed to preview
- Target files/tests: `lib/google/drive.js`, `test/google-drive.test.js`, `.env.example`, `README.md`, Vercel preview env, recent preview checkout records
- Discriminating checks: confirm whether Drive folder creation can preserve usable folder links when sharing fails; confirm whether a preview-only share override can safely route sandbox sharing to a real Google account; confirm the latest preview checkout persists Drive URLs and Drive permissions for the override account

### Done

- Updated `lib/google/drive.js` so preview/sandbox environments can use `GOOGLE_DRIVE_TEST_SHARE_EMAIL` as a non-live sharing override while keeping live behavior unchanged.
- Added focused tests for the Drive share override and verified they pass.
- Documented the override in `.env.example` and `README.md`.
- Added `GOOGLE_DRIVE_TEST_SHARE_EMAIL` to Vercel preview and set it to `870skitzofrenzy@gmail.com`.
- Deployed preview `https://dirt-cat-records-ldtf5xd5h-dirt-cat-records-projects.vercel.app` and repointed the stable preview alias to that deployment.
- Ran a fresh sandbox preview checkout on the stable alias and confirmed Vercel logs show `POST /api/create-paypal-order 200`, `POST /api/capture-paypal-order 200`, `GET /success.html 200`, and repeated `POST /api/webhooks/paypal 200`.
- Queried preview Supabase and confirmed the latest project record now has `drive_project_folder_url`, `drive_upload_folder_url`, and `drive_finals_folder_url` populated.
- Queried Google Drive permissions for the latest upload folder and confirmed `870skitzofrenzy@gmail.com` has `writer` access.

### Context Check (After)

- Validation run:
  - `node --test test/google-drive.test.js test/studio-workflow.test.js`
  - `npm run check:js`
  - `git diff --check`
  - `npx vercel --yes`
  - `npx vercel alias set dirt-cat-records-ldtf5xd5h-dirt-cat-records-projects.vercel.app dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app`
  - preview Supabase record queries for recent `payments`, `orders`, `projects`, `email_events`, and `project_events`
  - Google Drive permissions query on upload folder `1Vrua45dm5SURQW2SU9-HQXG95Q3cs5WS`
- Codebase delta summary:
  - Updated `lib/google/drive.js`
  - Updated `test/google-drive.test.js`
  - Updated `.env.example`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Verify production-domain magic-link behavior.
- Verify Resend sender, reply-to, and deliverability behavior beyond provider acceptance.
- Restore Vercel Authentication after preview webhook testing is complete.

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `README.md`, `docs/execution-log.md`, `CONTEXT.md`, `docs/adr/0001-paypal-metadata-versioning.md`
- Skill used: `diagnose`
- Codebase state: dirty docs-only worktree on `main...origin/main` at `27aabae` from the PayPal deepening-plan sync; no application-code changes yet in this step
- Target files/tests: `api/capture-paypal-order.js`, `test/paypal-api.test.js`
- Discriminating check: simulate a PayPal order read without `purchase_units[0].custom_id` while the capture response still includes valid metadata

### Done

- Reproduced the current 409 failure path with a mocked capture-route run where the initial order read omitted `custom_id` but the capture response still included valid checkout metadata.
- Added a focused regression test in `test/paypal-api.test.js` that encoded that exact browser-adjacent failure mode.
- Confirmed the new regression test failed before the fix.
- Updated `api/capture-paypal-order.js` so the route restores checkout metadata from either the initial PayPal order read or the capture response.
- Attached the PayPal order/capture payloads to thrown metadata errors so capture-conflict diagnostics can report the actual presence/absence of `custom_id` more accurately.
- Confirmed the focused regression test now passes.

### Context Check (After)

- Validation run:
  - `node --test test/paypal-api.test.js` (pass)
  - `npm run check:js` (pass)
  - `get_errors` on `api/capture-paypal-order.js` and `test/paypal-api.test.js` (pass)
- Codebase delta summary:
  - Updated `api/capture-paypal-order.js`
  - Updated `test/paypal-api.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Retry the public preview sandbox checkout with this fix deployed or running locally and confirm the browser no longer stops at `PayPal order is missing checkout metadata.`
- After that browser path is clear, continue the real webhook verification flow from the Stage 7 plan.

---

## Step 21 - Deploy Fresh Preview With Capture Metadata Fallback Fix

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: Verify PayPal sandbox checkout and webhook end to end)

### Will Be Done

- Run the repo preflight, deploy the current worktree to a fresh Vercel preview, and verify the new checkout URL is reachable so the browser retest uses the capture-fix build instead of the older preview deployment.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `README.md`, `docs/execution-log.md`
- Codebase state: dirty `main...origin/main` at `27aabae` with the PayPal capture fallback fix, focused regression test, and synced tracking docs not yet deployed
- Target files/tests: Vercel preview deployment, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Discriminating check: confirm the new preview checkout URL returns `200` before handing it off for browser retest

### Done

- Ran `npm run deploy:preflight` and confirmed the current worktree still passes function-limit, full test suite, JS syntax checks, and diff hygiene.
- Deployed the current worktree to a fresh Vercel preview deployment.
- Recorded the new preview URLs:
  - `https://dirt-cat-records-3dcr0o8r9-dirt-cat-records-projects.vercel.app`
  - `https://dirt-cat-records-3dcr0o8r9-dirt-cat-records-projects.vercel.app/checkout.html`
- Verified the fresh preview checkout URL returns `HTTP/2 200`.

### Context Check (After)

- Validation run:
  - `npm run deploy:preflight` (pass)
  - `npx vercel --yes` (pass, fresh preview deployment created)
  - `curl -I -s https://dirt-cat-records-3dcr0o8r9-dirt-cat-records-projects.vercel.app/checkout.html | head -n 5` (pass, `HTTP/2 200`)
- Codebase delta summary:
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Retry the sandbox checkout in the browser on the fresh preview deployment and confirm the previous metadata error is gone.
- After the browser path succeeds, verify the webhook result against PayPal Developer and preview logs.

---

## Step 22 - Add Workflow Env Parity Audit

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 0 setup reliability + Stage 7 workflow hardening)

### Will Be Done

- Add an automated environment parity audit and document the repo-standard extension attachment workflow so provider setup drift can be checked repeatably without exposing secrets.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: clean `main...origin/main` at `27aabae`
- Target files/tests: new `scripts/check-env-parity.js`, `package.json`, `.vscode/tasks.json`, `README.md`, `docs/agent-handoff.md`, `docs/roadmap.md`
- Discriminating check: validate the new script against a generated non-secret passing sample and an intentionally incomplete failing sample before using it on real env files

### Done

- Added `scripts/check-env-parity.js` to compare required env-key presence against `.env.example` without printing secret values.
- Added profile-aware checks for local, preview, and production env files, including preview/production `PAYPAL_ENV` expectations.
- Added `npm run check:env` and a matching VS Code task so the audit is available from both CLI and editor workflow surfaces.
- Added the new script to `npm run check:js` so it stays inside the repo's existing syntax gate.
- Updated `README.md` with the repo-standard `npx supabase ...` and `npx vercel ...` CLI strategy, an explicit extension attachment checklist, and the local/preview/production env audit commands.
- Updated `docs/agent-handoff.md` and `docs/roadmap.md` so the env parity audit becomes part of the standing workflow constraint.

### Context Check (After)

- Validation run:
  - `node scripts/check-env-parity.js <generated-valid-sample> --profile local` (pass)
  - `node scripts/check-env-parity.js <generated-incomplete-sample> --profile local` (fail as expected)
  - `npm run check:js` (pass)
- Codebase delta summary:
  - Added `scripts/check-env-parity.js`
  - Updated `package.json`
  - Updated `.vscode/tasks.json`
  - Updated `README.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Run `npm run check:env` against the active `.env.local` and record any missing-key findings.
- Pull preview and production Vercel env files and run the same audit against both before changing any provider settings.

---

## Step 23 - Resync Live-State Docs To b9436bd Workflow Reality

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 0 source-of-truth hygiene + Stage 7 launch hardening)

### Will Be Done

- Update the live-state docs so they match the current `b9436bd` baseline, the package/tooling reality, and the latest env-audit caveat before resuming implementation work.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
- Codebase state: `main...origin/main` at `b9436bd` with doc-only drift in `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and `docs/execution-log.md`
- Target files/tests: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`, `docs/execution-log.md`
- Discriminating checks: confirm package/tooling reality from `package.json` and `.vscode/tasks.json`; confirm whether env-pull parity findings reflect missing key names or empty pulled values

### Done

- Updated `README.md` so the current code baseline points at `b9436bd`, package-level `npm run dev:stack` is described accurately, and the env audit section now warns that pulled Vercel env files can contain empty placeholders on this machine.
- Updated `docs/roadmap.md` so the Stage 7/current-workflow state matches the `b9436bd` baseline and the package-level local startup reality.
- Updated `docs/agent-handoff.md` so the current repo state, last pushed commit, recently landed workflow changes, and workflow caveats all match the latest codebase reality.
- Updated `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md` so the plan starts from `b9436bd` and reflects the current env-audit caveat.
- Appended this execution-log entry instead of rewriting older historical steps.

### Context Check (After)

- Validation run:
  - `get_errors` on the updated doc files
  - `git diff --check`
- Codebase delta summary:
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Finish the doc-state sync by validating the updated files and reviewing the resulting worktree.
- Once the live-state docs are internally consistent, resume Stage 7 webhook verification from the current preview deployment.

---

## Step 24 - Publish Architecture Readiness Review And Remove Doc Drift Traps

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 0 source-of-truth hygiene + Stage 7 launch hardening)

### Will Be Done

- Add one durable architecture readiness review, then resync the editable source-of-truth docs so agents and operators stop depending on duplicated preview URLs, frozen commit hashes, and other drift-prone state prose.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`, `CONTEXT.md`, `docs/adr/0001-paypal-metadata-versioning.md`, `docs/adr/0002-payment-purpose-routing.md`, `docs/adr/0003-delivery-lock-and-balance-gating.md`, `docs/adr/0004-portal-action-validation.md`
- Codebase state: `main...origin/main` with doc-only drift in `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, and `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`; runtime code still validated earlier in the session through `npm run deploy:preflight`
- Target files/tests: new `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`, `docs/execution-log.md`
- Discriminating check: confirm the doc sync lands without whitespace or patch-hygiene regressions before any commit or push

### Done

- Added `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md` as the durable gap register for current architecture friction, immediate blockers, and anti-drift rules.
- Updated `README.md` with a documentation map, anti-drift guidance, the architecture review link, and a less brittle current-state summary.
- Updated `docs/roadmap.md` so Stage 7 points at the real webhook truth gap without freezing the active preview URL into another editable doc.
- Updated `docs/agent-handoff.md` so the next worker starts from git and Vercel as the live state source of truth, while still inheriting the current next action and architecture constraints.
- Updated `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md` so the plan references the new durable review and explicitly carries the Hobby-cap deployment constraint.
- Appended this execution-log entry instead of rewriting earlier historical steps.

### Context Check (After)

- Validation run:
  - `git diff --check` (pass)
- Codebase delta summary:
  - Added `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Re-run doc hygiene validation after this append-only log update.
- Commit and push the documentation sync so the next session starts from a clean, indexed repo state.

---

## Step 25 - Add Local Env Profile Switching Without Changing Runtime Filenames

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 0 source-of-truth workflow hardening)

### Will Be Done

- Add local preview/production env profile helpers that keep `.env.local` as the only runtime-active filename so local env switching becomes more automatic without breaking the current loader seam.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: clean `main...origin/main` after the architecture-readiness doc sync; current runtime env loading still points at `.env.local`
- Target files/tests: new `scripts/use-local-env.js`, `package.json`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Discriminating check: verify the helper can switch preview and production profiles inside a temporary directory while leaving the repo's real local secret files untouched

### Done

- Added `scripts/use-local-env.js` with three commands:
  - `init <preview|production>` to create `.env.local.preview` or `.env.local.production` from `.env.example`
  - `use <preview|production>` to copy the stored profile into `.env.local`
  - `status` to report the active `.env.local` state and available stored profiles
- Added package scripts for local env profile initialization, activation, status, and profile-specific env checks.
- Kept `.env.local` as the only runtime-active filename so `lib/env/runtime.js`, `scripts/google-refresh-token.js`, and existing operator commands do not need to change.
- Updated the repo docs so the new local env workflow is explicit and does not compete with the deployed Vercel env workflow.

### Context Check (After)

- Validation run:
  - `node --check scripts/use-local-env.js` (pass)
  - temporary-directory profile switch exercise for `preview`, `production`, and `status` using the new helper without touching real repo secrets (pass)
  - package-script lookup through `require('./package.json')` for `env:use:preview`, `env:use:production`, `env:status`, and `check:js` (pass)
- Codebase delta summary:
  - Added `scripts/use-local-env.js`
  - Updated `package.json`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Run `npm run check:js` and `git diff --check` after the final doc/package sync.
- If the workflow feels right in practice, optionally expose the env profile commands as VS Code tasks later.

## Step 32 - Public Preview Fingerprint Comparison Path

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: verify real sandbox webhook and automation round-trip)

### Will Be Done

- Expose the same safe runtime fingerprint through the public checkout-config route so preview env drift can be checked without admin auth, then compare a real preview deployment against `.env.local.preview`.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: dirty `main` worktree with runtime-fingerprint changes not yet committed
- Target files/tests: `api/checkout-config.js`, `test/paypal-api.test.js`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Discriminating check: verify the public checkout-config response stays browser-safe and matches the local preview fingerprint on a fresh preview deployment

### Done

- Updated `api/checkout-config.js` to return `runtimeFingerprint` alongside the existing public browser config.
- Updated `test/paypal-api.test.js` to verify the new public fingerprint stays non-secret.
- Created a fresh preview deployment from the current workspace: `https://dirt-cat-records-li7x9esn0-dirt-cat-records-projects.vercel.app`.
- Compared `GET /api/checkout-config` on that deployment against `.env.local.preview` and confirmed all provider-critical fields match.
- Verified the only fingerprint difference is `SITE_URL`, which is expected: local preview uses `http://localhost:3000` while deployed preview uses `https://www.dirtcatrecords.com`.
- Updated operator docs so the default preview drift check is now public `GET /api/checkout-config` first, admin setup second.

### Context Check (After)

- Validation run:
  - `node --test test/paypal-api.test.js` (pass)
  - live fetch comparison against deployed preview `/api/checkout-config` (pass)
- Codebase delta summary:
  - Updated `api/checkout-config.js`
  - Updated `test/paypal-api.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Stop treating preview env drift as the explanation for missing side effects; the active preview provider settings now match `.env.local.preview` except for the expected `SITE_URL` difference.
- Continue diagnosis on the real webhook/automation path itself, using the verified preview deployment and the public fingerprint path when env questions recur.

---

## Step 33 - Fix Customer Portal Magic-Link Signup Fallback

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: verify Supabase magic link redirects on the production domain)

### Will Be Done

- Diagnose why customer portal magic-link emails are landing on a Supabase-hosted `requested_path_is_invalid` error, then fix the repo-controlled part of the flow so existing customers sign in through magic links instead of browser-driven signup confirmation.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: dirty `main` worktree after the preview PayPal and Drive verification fixes
- Target files/tests: `portal.js`, auth helpers under `lib/auth/`, portal API handlers under `api/portal/`, focused auth tests
- Discriminating checks:
  - inspect the portal magic-link request path and current Supabase auth assumptions
  - confirm whether hosted Supabase signup links are using an invalid redirect target
  - confirm whether the portal currently relies on `signInWithOtp()` auto-creating auth users in the browser

### Done

- Confirmed the browser portal flow was calling `supabaseClient.auth.signInWithOtp()` directly and allowing browser-side auth-user creation.
- Confirmed hosted Supabase signup-link fallback is externally misconfigured: generated links currently use `redirect_to=www.dirtcatrecords.com`, which lacks `https://` and matches the observed `requested_path_is_invalid` failure.
- Added `lib/auth/supabase-admin.js` with `ensureConfirmedAuthUser()` so the server can provision confirmed Supabase auth users through the admin API.
- Added `api/portal/auth.js`, which only provisions auth users for known customer emails already present in the app database.
- Updated `portal.js` so the browser first calls `/api/portal/auth`, then requests the magic link with `shouldCreateUser: false`.
- Added focused tests for the new portal auth endpoint and the Supabase admin provisioning helper.
- Updated `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and `docs/execution-log.md` so the external Supabase dashboard fix remains explicit.

### Context Check (After)

- Validation run:
  - `node --test test/portal-auth-api.test.js test/supabase-admin-auth.test.js`
  - `npm run check:js`
  - direct hosted Supabase admin `generate_link` probe showing `redirect_to=www.dirtcatrecords.com`
- Codebase delta summary:
  - Added `lib/auth/supabase-admin.js`
  - Added `api/portal/auth.js`
  - Updated `portal.js`
  - Added `test/portal-auth-api.test.js`
  - Added `test/supabase-admin-auth.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Correct hosted Supabase Auth URL Configuration so `Site URL` is `https://www.dirtcatrecords.com`.
- Re-test the real customer portal magic-link flow on production after that dashboard change.
- Keep the new portal auth preparation step in place so customer access no longer depends on browser-side signup creation.

Update: the hosted Supabase URL setting was corrected after this entry was written, and the auth preparation step was then merged into `api/portal/actions.js?action=auth` because a standalone `api/portal/auth.js` exceeded the Vercel Hobby 12-function cap. Fresh preview deployment `https://dirt-cat-records-d60xnicju-dirt-cat-records-projects.vercel.app` now includes the merged flow, with live checks confirming:

- deployed `portal.js` calls `fetch("/api/portal/actions?action=auth")`
- deployed `portal.js` sets `shouldCreateUser: false`
- `POST /api/portal/actions?action=auth` returns app JSON (`No portal access found for that email.`) instead of `404`

---

## Step 34 - Guard Portal Magic-Link Retries And Classify Preview Deploy Failure

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7: verify Supabase magic link behavior on preview and production)

### Will Be Done

- Diagnose the latest failed preview deployment email and the portal `email rate limit exceeded` screenshot, then fix the repo-controlled portal retry path if the deployment failure proves transient.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Codebase state: dirty `main...origin/main` with in-progress Stage 7 portal/auth work already present in the worktree
- Target files/tests: `portal.js`, new `test/portal-login.test.js`, Vercel preview deployment status
- Discriminating checks:
  - run local deploy readiness and preview env parity checks to separate repo breakage from provider drift
  - inspect the failed preview deployment directly from Vercel
  - inspect the portal client submit path for duplicate-send or cooldown gaps before editing

### Done

- Ran `npm run deploy:preflight` and confirmed the repo still passes the local deploy gate.
- Ran `npm run check:env:preview` and confirmed the local preview profile only surfaced the existing missing `GOOGLE_DRIVE_TEST_SHARE_EMAIL` finding, not a new code/runtime break.
- Inspected the failed preview deployment with `vercel inspect --logs` and confirmed Vercel completed `vercel build`; the failure happened afterward during output deploy, and the immediately following preview deployment reached `Ready`.
- Confirmed `portal.js` had no submit lock or resend cooldown around `supabaseClient.auth.signInWithOtp(...)`, which made the browser vulnerable to Supabase OTP throttling during quick retries.
- Updated `portal.js` to normalize the email, prevent concurrent sends in the same tab, persist a one-minute resend cooldown in session storage, disable the submit button while waiting, and replace the raw provider throttle message with a clearer wait-state message.
- Added focused coverage in `test/portal-login.test.js` for rate-limit detection and cooldown helper behavior.
- Updated `README.md`, `docs/roadmap.md`, and `docs/agent-handoff.md` with the verified transient-deploy finding and the new portal resend guard.

### Context Check (After)

- Validation run:
  - `node --check portal.js` (pass)
  - `node --test test/portal-login.test.js test/portal-auth-api.test.js` (pass)
  - `npx vercel ls dirt-cat-records` (shows failed preview followed by a newer `Ready` preview)
  - `npx vercel inspect dirt-cat-records-f4g6q599y-dirt-cat-records-projects.vercel.app --logs` (shows build completion before deploy-stage error)
- Codebase delta summary:
  - Updated `portal.js`
  - Added `test/portal-login.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Re-test one real customer portal magic-link flow on the latest `Ready` preview deployment and confirm the first send lands while duplicate retries are held in the browser.
- Verify the same portal magic-link behavior on the canonical production domain after the next deploy.
- Continue the remaining Stage 7 launch-hardening checks only after the portal auth path is externally verified again.

Update: after this step, a fresh preview deployment with the resend guard was created and the shared preview alias was repointed to it. Follow-up verification confirmed the alias now serves the patched `portal.js` containing:

- `fetch("/api/portal/actions?action=auth")`
- `shouldCreateUser: false`
- the friendly cooldown message (`A magic link was already sent recently...`)
- the resend button cooldown label (`Resend in ...s`)

---

## Step 35 - Plan Workflow And Version-Control Hardening

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 0 source-of-truth hardening before more shared preview verification)

### Will Be Done

- Write one explicit repo-owned plan for branch discipline, deployment provenance, alias rules, and doc ownership so shared preview and production work stop drifting away from known commits.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/execution-trail.md`, `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`
- Codebase state: dirty `main...origin/main` at `ae958f9` with in-progress Stage 7 runtime and doc changes already present in the worktree; current drift pain is operational, not a new code regression
- Target files/tests: new `docs/superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Discriminating checks:
  - confirm the existing anti-drift rules already documented in the architecture readiness review
  - confirm the repo still lacks one explicit contract for branch roles, shared-preview provenance, and doc ownership

### Done

- Added `docs/superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md` as the ordered workflow plan for the actual failure mode behind recent wasted time: drift between local worktree state, pushed commit state, shared preview alias targets, and editable docs.
- The plan defines immediate operating rules, a target workflow contract, and ordered tasks for branch/worktree discipline, a deployment ledger, shared-preview versus diagnostic-preview separation, doc ownership cleanup, guarded release commands, and build provenance.
- Updated `README.md` to point operators at the new workflow plan and to record that deployment provenance is now a first-class workflow concern.
- Updated `docs/roadmap.md` so workflow hardening is explicitly the current next focus before more shared preview or production verification.
- Updated `docs/agent-handoff.md` so the next worker starts by executing the workflow hardening plan rather than continuing provider debugging on a drifting deployment surface.

### Context Check (After)

- Validation run:
  - `get_errors` on the new plan and updated source-of-truth docs
  - `git diff --check` on the touched docs
- Codebase delta summary:
  - Added `docs/superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Execute Tasks 0 through 3 of the workflow hardening plan before more shared preview or production verification work.
- After the workflow contract is in place, resume the remaining Stage 7 portal and webhook verification steps on top of a shared preview that is tied to a known pushed commit.

---

## Step 36 - Implement Workflow Contract Tasks 0 Through 3

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 7 retest workflow hardening before more portal/webhook verification)

### Will Be Done

- Implement Tasks 0 through 3 from the workflow and version-control hardening plan, then reset the shared preview alias onto a clean deployment tied to a pushed SHA so Stage 7 retests can resume on trustworthy provenance.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/workflow.md`, `docs/deployment-preflight.md`, `docs/superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md`
- Codebase state: dirty `main...origin/main` at `ae958f9` with unrelated in-progress runtime and doc changes already present in the worktree; shared preview alias provenance was still ambiguous relative to a known pushed commit
- Target files/tests: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/workflow.md`, `docs/deployment-preflight.md`, `docs/deployment-ledger.md`, `scripts/record-deployment.js`, `package.json`, `docs/superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md`, Vercel preview alias and deployment checks

### Done

- Implemented Task 0 by freezing risky shared-preview and production workflow paths in `README.md`, `docs/roadmap.md`, and `docs/agent-handoff.md`.
- Implemented Task 1 by adding `docs/workflow.md`, defining branch roles, documenting the standard start-work flow, and treating dirty `main` as recovery rather than normal operation.
- Implemented Task 2 by adding `docs/deployment-ledger.md`, adding `scripts/record-deployment.js`, wiring `npm run record:deployment`, and documenting the ledger requirement in the owning docs.
- Implemented Task 3 by separating diagnostic preview from shared preview, defining alias rules, and documenting the retest contract in `README.md`, `docs/deployment-preflight.md`, `docs/agent-handoff.md`, and `docs/workflow.md`.
- Created a clean detached git worktree at pushed `ae958f9`, published preview deployment `https://dirt-cat-records-k038629yi-dirt-cat-records-projects.vercel.app`, repointed the stable shared preview alias to that deployment, and recorded the provenance in `docs/deployment-ledger.md`.
- Fixed a formatting bug in `scripts/record-deployment.js` so future ledger appends always start on a new line.
- Smoke-validated the shared preview alias: `portal.html` returns `200`, `success.html` renders in the browser, `GET /api/checkout-config` returns public config, malformed `POST /api/webhooks/paypal` returns `400`, and the portal page loads the expected email + magic-link UI on the shared alias.

### Context Check (After)

- Validation run:
  - `git diff --check -- README.md docs/roadmap.md docs/agent-handoff.md` (pass)
  - `git diff --check -- README.md docs/agent-handoff.md docs/workflow.md` (pass)
  - `node --check scripts/record-deployment.js && git diff --check -- README.md docs/agent-handoff.md docs/deployment-ledger.md package.json scripts/record-deployment.js` (pass)
  - `git diff --check -- README.md docs/deployment-preflight.md docs/agent-handoff.md docs/roadmap.md docs/workflow.md` (pass)
  - `node --check scripts/record-deployment.js && git diff --check -- docs/deployment-ledger.md scripts/record-deployment.js` (pass)
  - `npx vercel alias ls` (pass, stable shared preview alias points at `dirt-cat-records-k038629yi-dirt-cat-records-projects.vercel.app`)
  - `curl -I -sS https://dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app/portal.html` (pass, `200`)
  - `curl -sS https://dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app/api/checkout-config` (pass)
  - `curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://dirt-cat-records-870dudemcgee-dirt-cat-records-projects.vercel.app/api/webhooks/paypal` (pass, `400` malformed-request response)
  - shared-preview browser snapshot on `portal.html` and `success.html` (pass, pages render on the ledgered alias)
- Codebase delta summary:
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Added `docs/workflow.md`
  - Updated `docs/deployment-preflight.md`
  - Added `docs/deployment-ledger.md`
  - Added `scripts/record-deployment.js`
  - Updated `package.json`
  - Updated `docs/superpowers/plans/2026-05-20-workflow-and-version-control-hardening-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Run one real portal magic-link test on the shared preview deployment recorded in `docs/deployment-ledger.md` and confirm first-send plus browser-side retry handling.
- Run the next real checkout/webhook retest against that same shared preview alias before changing production.
- After the preview truth gap is re-confirmed, deploy the same portal auth path to production and continue the ordered PayPal environment deepening plan.

---

## Step 37 - Publish Deep Modules Architecture Plan And Resync Source-Of-Truth Docs

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered architecture follow-on after Stage 7 and the PayPal environment plan)

### Will Be Done

- Turn the current architecture findings into one executable deep-modules plan, then wire that plan into the repo docs that steer future implementation work.

### Context Check (Before)

- Plan docs reviewed: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`, `CONTEXT.md`, `docs/adr/0001-paypal-metadata-versioning.md`, `docs/adr/0002-payment-purpose-routing.md`, `docs/adr/0003-delivery-lock-and-balance-gating.md`, `docs/adr/0004-portal-action-validation.md`
- Skills reviewed before action: `using-superpowers`, `writing-plans`, `improve-codebase-architecture`, `doc-coauthoring`
- Codebase state: docs-only planning slice; live worktree cleanliness and latest pushed commit must still be confirmed from git before executing any task from the new plan
- Target files/tests: new `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`, `docs/execution-log.md`
- Discriminating checks:
  - confirm there is already a durable architecture gap register but no ordered deep-module execution plan
  - confirm the repo source-of-truth docs can reference one new plan without freezing new runtime facts into multiple places

### Done

- Added `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md` as the ordered follow-on plan for deepening the Project payment transition, Project event schema, Quote lifecycle, Portal Action policy, and follow-up orchestration Modules.
- Kept the execution order biased toward deep Modules: live-provider truth first, PayPal seam work second, then one workflow Module slice at a time.
- Updated `README.md` so the operator-facing documentation map now points to the new deep-modules plan.
- Updated `docs/roadmap.md` so the staged checklist now carries the ordered post-PayPal deepening slices explicitly.
- Updated `docs/agent-handoff.md` so the next worker can place the deep-modules plan correctly relative to Stage 7 and the PayPal plan.
- Updated `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md` so the durable review now points at the new ordered plan and recommended execution order.
- Appended this execution-log entry instead of rewriting earlier historical steps.

### Context Check (After)

- Validation run:
  - `get_errors` on `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`, and `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
  - `git diff --check -- README.md docs/roadmap.md docs/agent-handoff.md docs/execution-log.md docs/superpowers/specs/2026-05-20-architecture-readiness-review.md docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
- Codebase delta summary:
  - Added `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Finish the active Stage 7 portal and checkout/webhook truth checks on the ledgered shared preview.
- Execute `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md` in order while it remains the controlling uncertainty.
- After that plan is no longer the bottleneck, execute the new deep-modules plan one Module slice at a time.

---

## Step 38 - Centralize PayPal Environment Configuration

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered follow-on after Stage 7 webhook proof)

### Will Be Done

- Add one owning PayPal environment configuration Module, migrate the current PayPal callers onto it, and lock down the shared behavior with focused tests.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`, `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`
- Skills reviewed before action: `using-superpowers`, `executing-plans`
- Codebase state: dirty `main...origin/main` at `ae958f9`; existing uncommitted changes were left intact and not reverted
- Target files/tests: new `lib/paypal/environment-config.js`, `lib/paypal/client-factory.js`, `lib/paypal/webhook.js`, `lib/automation/setup-checks.js`, `api/create-paypal-order.js`, `test/paypal-client-factory.test.js`, `test/paypal-webhook.test.js`, `test/setup-checks.test.js`
- Discriminating checks:
  - confirm whether PayPal environment normalization and base-url selection are duplicated across multiple callers
  - confirm whether a shared Module can replace that duplication without widening the existing PayPal caller Interfaces

### Done

- Added `lib/paypal/environment-config.js` as the owning Module for PayPal environment normalization, base-url selection, and non-secret client/webhook presence diagnostics.
- Updated `lib/paypal/client-factory.js` to consume the shared environment configuration Module instead of reading raw env fields independently.
- Updated `lib/paypal/webhook.js` so webhook signature verification and diagnostics now consume the same shared PayPal environment config.
- Updated `lib/automation/setup-checks.js` so the payments provider detail now comes from the shared PayPal environment config rather than a hard-coded generic message.
- Updated `api/create-paypal-order.js` to use the shared environment-config helpers and removed the recursive local `getPaypalBaseUrl` shadowing defect from that file.
- Added focused tests for the missing-credentials fast-fail path and the normalized payments-check detail, while keeping existing webhook diagnostics coverage passing.

### Context Check (After)

- Validation run:
  - `node --test test/paypal-client-factory.test.js test/paypal-webhook.test.js test/setup-checks.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check -- api/create-paypal-order.js lib/automation/setup-checks.js lib/paypal/client-factory.js lib/paypal/environment-config.js lib/paypal/webhook.js test/paypal-client-factory.test.js test/paypal-webhook.test.js test/setup-checks.test.js` (pass)
- Codebase delta summary:
  - Added `lib/paypal/environment-config.js`
  - Updated `lib/paypal/client-factory.js`
  - Updated `lib/paypal/webhook.js`
  - Updated `lib/automation/setup-checks.js`
  - Updated `api/create-paypal-order.js`
  - Updated `test/paypal-client-factory.test.js`
  - Updated `test/paypal-webhook.test.js`
  - Updated `test/setup-checks.test.js`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Finish the active Stage 7 portal and checkout/webhook truth checks on the ledgered shared preview if they are still the controlling uncertainty.
- Resume `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md` at Task 2: split webhook identity from request verification.
- After the PayPal plan is complete, return to the ordered deep-modules architecture plan.

---

## Step 39 - Split PayPal Webhook Identity From Request Verification

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered follow-on after Stage 7 webhook proof)

### Will Be Done

- Add a constructed PayPal webhook verifier Module so webhook identity and environment consistency are validated before request-time signature verification.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
- Codebase state: dirty `main...origin/main` at `ae958f9`; existing uncommitted changes were left intact and not reverted
- Target files/tests: new `lib/paypal/webhook-verifier.js`, `lib/paypal/webhook.js`, `api/webhooks/paypal.js`, `package.json`, `test/paypal-webhook.test.js`, `test/paypal-webhook-route.test.js`
- Discriminating checks:
  - confirm whether webhook id and environment validity can move to construction time without changing the public route behavior
  - confirm the default route path still verifies signatures through PayPal and handles configuration failure through the existing server-error path

### Done

- Added `lib/paypal/webhook-verifier.js` as the owning Module for constructed PayPal webhook identity and request-time signature verification.
- Updated `lib/paypal/webhook.js` so the legacy `verifyPayPalWebhookSignature` Interface delegates through the constructed verifier, preserving existing callers while narrowing the implementation.
- Updated `api/webhooks/paypal.js` so the default handler path constructs the verifier once and converts construction-time configuration failures into the existing request-time server-error path.
- Added `lib/paypal/webhook-verifier.js` to `npm run check:js`.
- Added focused tests for missing webhook id, mismatched verifier environment inputs, and the route's default verifier path.

### Context Check (After)

- Validation run:
  - `node --test test/paypal-webhook.test.js test/paypal-webhook-route.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check -- api/create-paypal-order.js api/webhooks/paypal.js lib/automation/setup-checks.js lib/paypal/client-factory.js lib/paypal/environment-config.js lib/paypal/webhook-verifier.js lib/paypal/webhook.js package.json test/paypal-client-factory.test.js test/paypal-webhook-route.test.js test/paypal-webhook.test.js test/setup-checks.test.js` (pass)
- Codebase delta summary:
  - Added `lib/paypal/webhook-verifier.js`
  - Updated `lib/paypal/webhook.js`
  - Updated `api/webhooks/paypal.js`
  - Updated `package.json`
  - Updated `test/paypal-webhook.test.js`
  - Updated `test/paypal-webhook-route.test.js`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Finish the active Stage 7 portal and checkout/webhook truth checks on the ledgered shared preview if they are still the controlling uncertainty.
- Resume `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md` at Task 3: unify PayPal readiness checks.
- After the PayPal plan is complete, return to the ordered deep-modules architecture plan.

---

## Step 40 - Unify PayPal Readiness Checks

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered follow-on after Stage 7 webhook proof)

### Will Be Done

- Add one non-network PayPal readiness Module and consume it from setup checks and sandbox test mode so both surfaces report the same configuration conclusion.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
- Codebase state: dirty `main...origin/main` at `ae958f9`; existing uncommitted changes were left intact and not reverted
- Target files/tests: new `lib/paypal/readiness.js`, `lib/automation/setup-checks.js`, `lib/automation/test-mode-runner.js`, `package.json`, `test/setup-checks.test.js`, `test/test-mode-runner.test.js`, `test/admin-setup-api.test.js`
- Discriminating checks:
  - confirm setup checks and sandbox mode can share a deterministic readiness conclusion without making focused tests hit PayPal's network
  - confirm sandbox test mode records PayPal readiness before creating workflow artifacts

### Done

- Added `lib/paypal/readiness.js` as the owning Module for PayPal readiness diagnostics built on the shared environment config and webhook verifier seams.
- Updated `lib/automation/setup-checks.js` so the payments provider now uses `checkPayPalReadiness` and reports pass/fail detail consistently.
- Updated `lib/automation/test-mode-runner.js` so sandbox runs add a `paypal_readiness` step before workflow artifacts are created.
- Added `lib/paypal/readiness.js` to `npm run check:js`.
- Updated focused setup and sandbox tests so PayPal readiness is explicit in test fixtures and assertions.

### Context Check (After)

- Validation run:
  - `node --test test/setup-checks.test.js test/test-mode-runner.test.js test/admin-setup-api.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check -- lib/paypal/readiness.js lib/automation/setup-checks.js lib/automation/test-mode-runner.js package.json test/setup-checks.test.js test/test-mode-runner.test.js test/admin-setup-api.test.js` (pass)
- Codebase delta summary:
  - Added `lib/paypal/readiness.js`
  - Updated `lib/automation/setup-checks.js`
  - Updated `lib/automation/test-mode-runner.js`
  - Updated `package.json`
  - Updated `test/setup-checks.test.js`
  - Updated `test/test-mode-runner.test.js`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Finish the active Stage 7 portal and checkout/webhook truth checks on the ledgered shared preview if they are still the controlling uncertainty.
- Resume `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md` at Task 4: add explicit runtime environment lifecycle invariants for development, preview, and production.
- After the PayPal plan is complete, return to the ordered deep-modules architecture plan.

---

## Step 41 - Add Runtime Environment Lifecycle Invariants

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered follow-on after Stage 7 webhook proof)

### Will Be Done

- Add one runtime environment lifecycle Module and make PayPal readiness enforce the preview/production PayPal environment invariant.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
- Codebase state: dirty `main...origin/main` at `ae958f9`; existing uncommitted changes were left intact and not reverted
- Target files/tests: new `lib/env/runtime-environment.js`, `lib/paypal/environment-config.js`, `lib/paypal/readiness.js`, `lib/automation/business-config.js`, `package.json`, `test/business-config.test.js`, `test/setup-checks.test.js`
- Discriminating checks:
  - define the deployment lifecycle from `VERCEL_ENV` first and local `NODE_ENV` only as fallback
  - require production to use PayPal `live` and preview/development to use PayPal `sandbox`

### Done

- Added `lib/env/runtime-environment.js` as the owning Module for development, preview, and production lifecycle inference.
- Added PayPal lifecycle helpers that describe the expected PayPal environment for the active runtime.
- Updated `lib/paypal/environment-config.js` to expose `runtimeEnvironment`, `expectedPayPalEnv`, and `paypalEnvMatchesRuntime` alongside existing PayPal config diagnostics.
- Updated `lib/paypal/readiness.js` so readiness fails early when PayPal env conflicts with the runtime lifecycle.
- Updated `lib/automation/business-config.js` so business config and its redacted output expose the runtime lifecycle.
- Added `lib/env/runtime-environment.js` to `npm run check:js`.
- Added focused tests for business config lifecycle exposure and PayPal readiness failure on production/sandbox mismatch.

### Context Check (After)

- Validation run:
  - `node --test test/business-config.test.js test/setup-checks.test.js` (pass)
  - `node --test test/paypal-client-factory.test.js test/paypal-webhook.test.js test/paypal-webhook-route.test.js test/setup-checks.test.js test/test-mode-runner.test.js test/admin-setup-api.test.js test/business-config.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check -- lib/env/runtime-environment.js lib/paypal/environment-config.js lib/paypal/readiness.js lib/automation/business-config.js package.json test/business-config.test.js test/setup-checks.test.js` (pass)
  - `get_errors` on touched runtime lifecycle files and tests (pass)
- Codebase delta summary:
  - Added `lib/env/runtime-environment.js`
  - Updated `lib/paypal/environment-config.js`
  - Updated `lib/paypal/readiness.js`
  - Updated `lib/automation/business-config.js`
  - Updated `package.json`
  - Updated `test/business-config.test.js`
  - Updated `test/setup-checks.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Finish the active Stage 7 portal and checkout/webhook truth checks on the ledgered shared preview if they are still the controlling uncertainty.
- Resume `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md` at Task 5: extend payment-purpose routing with environment context.
- After the PayPal plan is complete, return to the ordered deep-modules architecture plan.

---

## Step 42 - Thread Runtime Context Through Payment Routing

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered follow-on after Stage 7 webhook proof)

### Will Be Done

- Extend the payment-purpose routing Interface so handlers can reason about runtime lifecycle context while preserving existing Checkout Payment, Quote Payment, and Balance Payment behavior.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
- Skills reviewed before action: `using-superpowers`, `executing-plans`
- Codebase state: dirty `main...origin/main` at `ae958f9`; existing uncommitted changes were left intact and not reverted
- Target files/tests: `lib/paypal/payment-router.js`, `lib/paypal/webhook.js`, `test/payment-router.test.js`, `test/paypal-webhook.test.js`
- Discriminating checks:
  - preserve the existing handler first argument and normalized-purpose behavior
  - avoid changing the PayPal metadata format unless environment context proves it is required

### Done

- Updated `lib/paypal/payment-router.js` so `routePaymentPurpose` passes a second handler argument containing `purpose`, `runtimeEnvironment`, `expectedPayPalEnv`, and `paypalEnv`.
- Added `buildPaymentRouteContext` as the context-building Interface for callers that need to inspect routing lifecycle state directly.
- Updated `lib/paypal/webhook.js` so webhook parsing passes the active env into the payment-purpose routing seam without changing the resulting payment records.
- Left `lib/paypal/order-metadata.js` unchanged because no metadata format change was required.
- Added focused tests proving route handlers receive runtime context and webhook parsing remains stable with production/live env context.

### Context Check (After)

- Validation run:
  - `node --test test/payment-router.test.js test/paypal-webhook.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check -- lib/paypal/payment-router.js lib/paypal/webhook.js test/payment-router.test.js test/paypal-webhook.test.js` (pass)
  - `get_errors` on touched routing and webhook files/tests (pass)
- Codebase delta summary:
  - Updated `lib/paypal/payment-router.js`
  - Updated `lib/paypal/webhook.js`
  - Updated `test/payment-router.test.js`
  - Updated `test/paypal-webhook.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Finish any remaining live-provider launch checks if they are still the controlling uncertainty.
- Execute `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md` in order, starting with the Project payment transition Module slice.

---

## Step 43 - Clean Worktree Classification And Project Payment Transition Module

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered deep-module workflow deepening)

### Will Be Done

- Classify dirty and untracked repo files before deleting anything, then execute the Project payment transition Module slice from the deep-modules architecture plan.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
- Skills reviewed before action: `using-superpowers`, `executing-plans`
- Codebase state: dirty `main...origin/main`; existing uncommitted changes were left intact and not reverted
- Cleanup checks:
  - `git status --porcelain=v1`
  - `git diff --name-status`
  - `git ls-files --others --exclude-standard`
  - reference checks for untracked files
  - temporary/backup-file scan
- Cleanup conclusion: no source files were deleted. Untracked files were referenced intentional modules/docs/tests, and ignored files were local secrets/runtime state such as `.env.local`, `.vercel/`, `node_modules/`, and Supabase local state.
- Target files/tests: new `lib/automation/project-payment-transition.js`, `lib/automation/studio-workflow.js`, `lib/automation/balance-payment-handler.js`, `lib/automation/delivery-lock.js`, `package.json`, new `test/project-payment-transition.test.js`

### Done

- Added `lib/automation/project-payment-transition.js` as the owning Module for Project financial transition policy.
- Moved checkout project creation financial fields, quote payment conversion fields, balance payment math, Project status, balance due, amount paid, and Delivery Lock outcomes behind the new Module.
- Updated `lib/automation/studio-workflow.js` so checkout and quote payment paths consume transition outputs instead of recomputing status and lock policy inline.
- Updated `lib/automation/balance-payment-handler.js` so balance payments consume transition outputs and remain focused on lookup, persistence, event recording, and linking.
- Collapsed `lib/automation/delivery-lock.js` into a compatibility alias over the deeper Project payment transition Module.
- Added direct Module tests for checkout deposit locking, quote conversion to balance due, and balance payment unlock after full payment.
- Added the new Module to `npm run check:js`.

### Context Check (After)

- Validation run:
  - `node --test test/project-payment-transition.test.js test/studio-workflow.test.js test/payment-router.test.js test/balance-payment-validator.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check -- lib/automation/project-payment-transition.js lib/automation/studio-workflow.js lib/automation/balance-payment-handler.js lib/automation/delivery-lock.js package.json test/project-payment-transition.test.js` (pass)
  - `get_errors` on touched payment transition files/tests (pass)
- Codebase delta summary:
  - Added `lib/automation/project-payment-transition.js`
  - Added `test/project-payment-transition.test.js`
  - Updated `lib/automation/studio-workflow.js`
  - Updated `lib/automation/balance-payment-handler.js`
  - Updated `lib/automation/delivery-lock.js`
  - Updated `package.json`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Continue `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md` at Task 2: deepen the Project event schema Module.

---

## Step 44 - Deepen Project Event Schema Module

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered deep-module workflow deepening)

### Will Be Done

- Add one owning Project event schema Module and move event meaning out of workflow, portal, follow-up, and admin persistence callers.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
- Codebase state: dirty `main...origin/main`; existing uncommitted changes were left intact and not reverted
- Target files/tests: new `lib/automation/project-event-schema.js`, `lib/automation/workflow-recorder.js`, `lib/db/studio-records.js`, `lib/automation/follow-up-dispatcher.js`, `api/portal/actions.js`, `lib/automation/studio-workflow.js`, `lib/automation/balance-payment-handler.js`, `package.json`, new `test/project-event-schema.test.js`
- Discriminating checks:
  - identify repeated Project event types, actors, messages, and metadata shapes before creating the Module
  - keep `workflow-recorder.js` focused on sequencing/persistence rather than event meaning
  - preserve existing event type strings and metadata contracts in focused tests

### Done

- Added `lib/automation/project-event-schema.js` with canonical Project event type constants, actor constants, event normalization, and named builders for workflow, portal, follow-up, and admin event families.
- Added `test/project-event-schema.test.js` covering canonical shape normalization, database-style input normalization, payment/portal event builders, and follow-up queue metadata.
- Updated `lib/db/studio-records.js` so `createProjectEvent` normalizes event shape at the Supabase boundary and admin/follow-up queue helpers use schema builders.
- Updated `lib/automation/studio-workflow.js`, `lib/automation/balance-payment-handler.js`, `lib/automation/follow-up-dispatcher.js`, and `api/portal/actions.js` so callers consume event builders instead of assembling raw event payloads inline.
- Left `lib/automation/workflow-recorder.js` focused on operation sequencing; event meaning now lives in the schema Module before recorder calls.
- Added the new Module to `npm run check:js`.

### Context Check (After)

- Validation run:
  - `node --test test/project-event-schema.test.js test/studio-records.test.js test/follow-up-dispatcher.test.js test/portal-actions.test.js test/studio-workflow.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check -- lib/automation/project-event-schema.js lib/db/studio-records.js lib/automation/studio-workflow.js lib/automation/balance-payment-handler.js lib/automation/follow-up-dispatcher.js api/portal/actions.js package.json test/project-event-schema.test.js` (pass)
  - `get_errors` on touched event schema files/tests (pass)
- Codebase delta summary:
  - Added `lib/automation/project-event-schema.js`
  - Added `test/project-event-schema.test.js`
  - Updated `lib/db/studio-records.js`
  - Updated `lib/automation/studio-workflow.js`
  - Updated `lib/automation/balance-payment-handler.js`
  - Updated `lib/automation/follow-up-dispatcher.js`
  - Updated `api/portal/actions.js`
  - Updated `package.json`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Continue `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md` at Task 3: deepen the Quote lifecycle Module.

---

## Step 45 - Deepen Quote Lifecycle Module

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered deep-module workflow deepening)

### Will Be Done

- Add one owning Quote lifecycle Module and move quote state transition decisions out of admin persistence, portal checkout, and payment confirmation callers.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
- Codebase state: dirty `main...origin/main`; existing uncommitted changes were left intact and not reverted
- Target files/tests: new `lib/automation/quote-lifecycle.js`, `lib/db/studio-records.js`, `api/portal/actions.js`, `lib/automation/project-payment-transition.js`, `package.json`, new `test/quote-lifecycle.test.js`, `test/admin-quotes-api.test.js`, `test/portal-accept-quote-api.test.js`, `test/studio-workflow.test.js`, `test/project-payment-transition.test.js`
- Discriminating checks:
  - keep admin quote create/send and portal quote checkout as Adapters over quote lifecycle decisions
  - preserve payment-purpose routing and metadata behavior from the accepted ADRs
  - keep Project financial transition policy separate from Quote state transitions

### Done

- Added `lib/automation/quote-lifecycle.js` with Quote status constants and lifecycle functions for created project patches, sent quote/project transitions, viewed patches, checkout intent calculation, and accepted quote patches.
- Updated `lib/db/studio-records.js` so admin quote creation and sending consume lifecycle transitions instead of assembling quote/project state patches inline.
- Updated `api/portal/actions.js` so quote checkout start uses lifecycle checkout eligibility, amount-due calculation, and viewed-state patching.
- Updated `lib/automation/project-payment-transition.js` so accepted quote patch construction is delegated to the Quote lifecycle Module while Project payment transition remains the owner of Project financial state.
- Added direct Quote lifecycle tests and route-level coverage that accepted quotes are rejected before checkout starts.
- Added the new Module to `npm run check:js`.

### Context Check (After)

- Validation run:
  - `node --test test/quote-lifecycle.test.js test/admin-quotes-api.test.js test/portal-accept-quote-api.test.js test/studio-workflow.test.js test/project-payment-transition.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check -- lib/automation/quote-lifecycle.js lib/automation/project-payment-transition.js api/portal/actions.js lib/db/studio-records.js package.json test/quote-lifecycle.test.js test/portal-accept-quote-api.test.js` (pass)
  - `get_errors` on touched quote lifecycle files/tests (pass)
- Codebase delta summary:
  - Added `lib/automation/quote-lifecycle.js`
  - Added `test/quote-lifecycle.test.js`
  - Updated `lib/db/studio-records.js`
  - Updated `api/portal/actions.js`
  - Updated `lib/automation/project-payment-transition.js`
  - Updated `test/portal-accept-quote-api.test.js`
  - Updated `package.json`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Continue `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md` at Task 4: deepen the Portal Action policy Module.

---

## Step 46 - Deepen Portal Action Policy Module

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered deep-module workflow deepening)

### Will Be Done

- Add one owning Portal Action policy Module and route browser visibility plus server authority checks through the same eligibility decisions.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
- Codebase state: dirty `main...origin/main`; existing uncommitted changes were left intact and not reverted
- Target files/tests: new `lib/portal/action-policy.js`, `lib/portal/action-rules.js`, `lib/portal/balance-payment-validator.js`, `api/portal/actions.js`, `portal.html`, `package.json`, new `test/portal-action-policy.test.js`, `test/portal-action-rules.test.js`, `test/balance-payment-validator.test.js`, `test/portal-actions.test.js`, `test/portal-view.test.js`
- Discriminating checks:
  - preserve ADR-0004 dual-layer validation by keeping browser/shared visibility and server authority as separate Adapters
  - make both Adapters consume one real policy seam for Balance Payment and Final Delivery approval
  - preserve existing portal action names and denial messages where customers already see them

### Done

- Added `lib/portal/action-policy.js` with `evaluatePortalAction`, `getPortalActionPolicy`, and `getAllowedPortalActions` for Balance Payment and Final Approval decisions.
- Updated `lib/portal/action-rules.js` so the browser/shared `canPayBalance`, `canApproveFinal`, and `getAllowedPortalActions` functions are compatibility Adapters over the policy Module.
- Updated `lib/portal/balance-payment-validator.js` so server balance payment authority uses the same policy reason, status, error, and amount-cents decision as visibility.
- Updated `api/portal/actions.js` so final approval authority uses the policy Module instead of an inline status/lock check.
- Added `lib/portal/action-policy.js` to `portal.html` before `action-rules.js` and to `npm run check:js`.
- Added direct policy tests plus parity coverage for the action-rules Adapter, balance payment validator, and final-approval route.

### Context Check (After)

- Validation run:
  - `node --test test/portal-action-policy.test.js test/portal-action-rules.test.js test/balance-payment-validator.test.js test/portal-actions.test.js test/portal-view.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check -- lib/portal/action-policy.js lib/portal/action-rules.js lib/portal/balance-payment-validator.js api/portal/actions.js portal.html package.json test/portal-action-policy.test.js test/portal-action-rules.test.js test/balance-payment-validator.test.js test/portal-actions.test.js` (pass)
  - `get_errors` on touched Portal Action policy files/tests (pass)
- Codebase delta summary:
  - Added `lib/portal/action-policy.js`
  - Added `test/portal-action-policy.test.js`
  - Updated `lib/portal/action-rules.js`
  - Updated `lib/portal/balance-payment-validator.js`
  - Updated `api/portal/actions.js`
  - Updated `portal.html`
  - Updated `test/portal-action-rules.test.js`
  - Updated `test/balance-payment-validator.test.js`
  - Updated `test/portal-actions.test.js`
  - Updated `package.json`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Continue `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md` at Task 5: deepen the follow-up orchestration Module.

---

## Step 47 - Deepen Follow-Up Orchestration Module

Date/Time: 2026-05-20
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (ordered deep-module workflow deepening)

### Will Be Done

- Add one owning follow-up orchestration Module and move candidate selection, queue intent normalization, enqueue outcome classification, and cron pipeline sequencing behind one Interface.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
- Codebase state: dirty `main...origin/main`; existing uncommitted changes were left intact and not reverted
- Target files/tests: new `lib/automation/follow-up-orchestrator.js`, `lib/automation/follow-up-selector.js`, `lib/automation/follow-up-dispatcher.js`, `lib/db/studio-records.js`, `api/cron/follow-ups.js`, `package.json`, new `test/follow-up-orchestrator.test.js`, `test/follow-up-selector.test.js`, `test/follow-up-dispatcher.test.js`, `test/follow-up-cron-api.test.js`, `test/studio-records.test.js`
- Discriminating checks:
  - keep Supabase persistence in `studio-records.js` and email transport/template dispatch in `follow-up-dispatcher.js`
  - make cron an Adapter over one run-pipeline Interface
  - preserve existing follow-up job, event, and email-event payload contracts

### Done

- Added `lib/automation/follow-up-orchestrator.js` with follow-up candidate selection, queue intent normalization, duplicate/enqueue outcome classification, and `runFollowUpPipeline` for dry-run, queue, and optional dispatch runs.
- Updated `api/cron/follow-ups.js` so the Vercel cron route delegates pipeline sequencing to `runFollowUpPipeline` instead of assembling candidates, queue results, and dispatch results inline.
- Updated `lib/db/studio-records.js` so `getFollowUpCandidates` and `queueFollowUpJobs` use the orchestrator for selection, persistence-ready job intent, duplicate skips, and enqueue failures while Supabase writes remain in the DB adapter.
- Kept `lib/automation/follow-up-dispatcher.js` as the email transport/template dispatch Adapter.
- Added direct orchestration tests covering candidate selection delegation, queue-intent normalization, queue outcome builders, dry-run payloads, and queue+dispatch pipeline runs.
- Added the new Module to `npm run check:js`.

### Context Check (After)

- Validation run:
  - `node --test test/follow-up-orchestrator.test.js test/follow-up-selector.test.js test/follow-up-dispatcher.test.js test/follow-up-cron-api.test.js test/studio-records.test.js` (pass)
  - `npm run check:js` (pass)
  - `git diff --check -- lib/automation/follow-up-orchestrator.js lib/db/studio-records.js api/cron/follow-ups.js package.json test/follow-up-orchestrator.test.js` (pass)
  - `get_errors` on touched follow-up orchestration files/tests (pass)
- Codebase delta summary:
  - Added `lib/automation/follow-up-orchestrator.js`
  - Added `test/follow-up-orchestrator.test.js`
  - Updated `lib/db/studio-records.js`
  - Updated `api/cron/follow-ups.js`
  - Updated `package.json`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Continue `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md` at Task 6: reassess whether email sequencing still needs its own deep Module.

---

## Step 48 - Deepen Email Sequence Choreography Module

Date/Time: 2026-05-20
Owner: Codex + Josh
Roadmap link: `docs/roadmap.md` (ordered deep-module workflow deepening)

### Will Be Done

- Add one owning email-sequence Module after the Task 6 deletion test showed sequencing policy still spread across workflow, admin delivery, portal action, and follow-up callers.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`, `CONTEXT.md`
- Codebase state: clean `main...origin/main` at `134a99e`; task branch `wip/email-sequence-choreographer` created before edits
- Target files/tests: new `lib/email/email-sequence-choreographer.js`, `lib/automation/studio-workflow.js`, `lib/automation/follow-up-dispatcher.js`, `api/portal/actions.js`, `lib/db/studio-records.js`, `lib/email/resend.js`, `package.json`, new `test/email-sequence-choreographer.test.js`, `test/studio-workflow.test.js`, `test/follow-up-dispatcher.test.js`, `test/resend-email.test.js`
- Discriminating checks:
  - keep template rendering and Resend transport in `lib/email/resend.js`
  - move workflow timing, send ordering, email-event metadata, and failure classification into one email-sequence Module
  - keep existing workflow semantics and email types stable

### Done

- Added `lib/email/email-sequence-choreographer.js` with the owning Interface for:
  - Project intake email ordering for free reviews and paid checkout Projects
  - Quote, Final Delivery, Portal Action, and follow-up reminder email message construction
  - ordered send execution, email-event metadata, send/failure classification, and optional throw-on-failure behavior
- Added `test/email-sequence-choreographer.test.js` with TDD coverage for sequence order, metadata logging, failure logging/throwing, and follow-up reminder message choreography.
- Updated `lib/automation/studio-workflow.js` so free-review and paid-project workflows build Project intake sequences through the new Module, and the default email Adapter logs through `sendEmailSequence`.
- Updated `lib/db/studio-records.js` so admin quote sending and Final Delivery/balance-due notifications use the sequence Module instead of inline send/log/failure blocks.
- Updated `api/portal/actions.js` so portal customer/admin emails use sequence-built messages and shared send/log handling.
- Updated `lib/automation/follow-up-dispatcher.js` so follow-up reminder message construction and email-event logging route through the email sequence Module while job status and Project events stay in the dispatcher.
- Kept `lib/email/resend.js` unchanged as the Resend transport/template Adapter.
- Added the new Module to `npm run check:js`.
- Updated `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and the deep-modules plan for Task 6 completion.

### Context Check (After)

- Validation run:
  - `node --test test/email-sequence-choreographer.test.js` first failed with `MODULE_NOT_FOUND` before implementation (expected TDD red)
  - `node --test test/email-sequence-choreographer.test.js test/studio-workflow.test.js test/follow-up-dispatcher.test.js test/resend-email.test.js test/portal-actions.test.js test/studio-records.test.js test/admin-project-detail-api.test.js` (pass, 78 tests)
  - `npm run check:js` (pass)
  - `git diff --check` (pass)
  - `npm test` (pass, 274 tests)
- Codebase delta summary:
  - Added `lib/email/email-sequence-choreographer.js`
  - Added `test/email-sequence-choreographer.test.js`
  - Updated `lib/automation/studio-workflow.js`
  - Updated `lib/automation/follow-up-dispatcher.js`
  - Updated `lib/db/studio-records.js`
  - Updated `api/portal/actions.js`
  - Updated `package.json`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/superpowers/plans/2026-05-20-deep-modules-architecture-plan.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Continue launch hardening from `docs/roadmap.md`: hosted Supabase Auth URL configuration and production magic-link verification, Resend deliverability verification, final launch-checklist docs, and preview protection restore after webhook testing is no longer needed.

---

## Step 49 - Support Form Containment Polish

Date/Time: 2026-05-21
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 2: Normalize form control sizing)

### Will Be Done

- Tighten support-page-specific form layout so text boxes and bottom actions stay visually contained in the support panel on narrow screens.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`, `README.md`
- Codebase state: `main...origin/main` with unrelated unstaged `api/webhooks/paypal.js` formatting change still present and excluded from this fix
- Target files/tests: `style.css`, `test/project-support-page.test.js`, support-flow docs

### Done

- Added support-page-specific form grid rules so the form itself, each support field, and every input/select/textarea has a shrink-safe layout boundary.
- Added support action-button grid rules so the submit and portal buttons fill the card cleanly and stack at the existing narrow-screen breakpoint.
- Added focused CSS regression coverage in `test/project-support-page.test.js`.
- Updated `README.md`, `docs/roadmap.md`, and `docs/agent-handoff.md` with the support-page containment follow-up.

### Context Check (After)

- Validation run:
  - `node --test test/project-support-page.test.js` (pass, 3 tests)
  - `npm run check:js` (pass)
  - `git diff --check` (pass)
  - `npm test` (pass, 292 tests)
  - `get_errors` on touched CSS/test/docs (pass)
- Codebase delta summary:
  - Updated `style.css`
  - Updated `test/project-support-page.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Commit and push the support page polish so the live deployment can pick it up.

---

## Step 50 - Support Layout and Navigation Follow-Up

Date/Time: 2026-05-21
Owner: GitHub Copilot + Josh
Roadmap link: `docs/roadmap.md` (Stage 2: Normalize form control sizing + support access)

### Will Be Done

- Make the support page change visibly distinct by giving it a dedicated centered layout and add a Support navigation button across the primary pages.

### Context Check (Before)

- Plan docs reviewed: `docs/roadmap.md`, `docs/agent-handoff.md`, `README.md`, `docs/execution-log.md`
- Codebase state: `main...origin/main` with unrelated unstaged `api/webhooks/paypal.js` formatting change still present and excluded from this fix
- Target files/tests: root HTML pages, `style.css`, `test/project-support-page.test.js`, status docs

### Done

- Added a visible `Support` navigation button on `index.html`, `checkout.html`, `portal.html`, `success.html`, `support.html`, and `admin.html`.
- Added support-specific page classes and CSS so `support.html` uses a centered one-column layout, an inset form surface, and non-sticky support context instead of the shared checkout two-column layout.
- Added focused regression coverage for the support page layout classes, cross-page support navigation, and support nav button styling.
- Updated `README.md`, `docs/roadmap.md`, and `docs/agent-handoff.md` with the support layout/navigation follow-up.

### Context Check (After)

- Validation run:
  - `node --test test/project-support-page.test.js` (pass, 5 tests)
  - `npm run check:js` (pass)
  - `git diff --check` (pass)
  - `get_errors` on touched HTML/CSS/test files (pass)
  - `npm test` (pass, 294 tests)
- Codebase delta summary:
  - Updated `index.html`
  - Updated `checkout.html`
  - Updated `portal.html`
  - Updated `success.html`
  - Updated `support.html`
  - Updated `admin.html`
  - Updated `style.css`
  - Updated `test/project-support-page.test.js`
  - Updated `README.md`
  - Updated `docs/roadmap.md`
  - Updated `docs/agent-handoff.md`
  - Updated `docs/execution-log.md`

### Needs To Be Done Next

- Commit and push the support layout/navigation follow-up so Vercel can deploy it.
