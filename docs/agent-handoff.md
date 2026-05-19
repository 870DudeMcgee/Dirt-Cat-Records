# Agent Handoff

This file is the working handoff for continuing Dirt Cat Records development after the roadmap, setup, success-flow, and portal-state checkpoints.

## Current Repo State

- Working repo: `/Users/josh/Desktop/dirt_cat_records_website_final/Dirt-Cat-Records-latest`
- Remote: `https://github.com/870DudeMcgee/Dirt-Cat-Records.git`
- Branch: `main`
- Latest pushed commit: `792a8ec feat: add admin project detail view`
- Local git status at handoff update time: clean and synced with `origin/main`
- Commit email used for pushed work: `Josh Mclean <870DudeMcgee@users.noreply.github.com>`

Older local copies were archived under:

- `/Users/josh/Desktop/dirt_cat_records_website_final/ARCHIVED_OLD_REPOS_REVIEW_BEFORE_DELETE`

Do not use the archived folders for new work.

## Next Agent Start Here

1. Work only in `/Users/josh/Desktop/dirt_cat_records_website_final/Dirt-Cat-Records-latest`.
2. Start by reading `docs/roadmap.md` and this file.
3. Confirm `git status -sb` is clean and on `main...origin/main`.
4. Continue Stage 3 with the next unchecked item: admin status update action.
5. Use TDD. Existing tests use Node's built-in runner, and server/browser JS files must be added to `npm run check:js`.
6. Before finishing a slice, run `npm test`, `npm run check:js`, and `git diff --check`.

## Completed Work

### Stage 0: Stabilize The Source Of Truth

Done:

- Created `docs/roadmap.md`.
- Expanded `README.md` with runtime overview, environment variables, launch checklist, and asset notes.
- Expanded `.env.example` to include PayPal, Supabase, Google Drive, Resend, admin, and test-run settings.
- Expanded `.gitignore`.
- Removed `.DS_Store` from git tracking.
- Documented the audio asset decision: keep the current WAV files for now, replace site previews with MP3 versions later.

Still open:

- Confirm a fresh clone can be configured from docs.

### Stage 1: Replace The Manual Paid Intake Flow

Done:

- Replaced the old `success.html` `mailto:` project intake form with a portal/email-first confirmation flow.
- Updated `success.js` so it only shows the paid order summary and does not imply manual intake is the primary path.
- Added `test/success-page.test.js` to prevent the `mailto:` flow from returning.

### Stage 2: Make The Customer Portal Feel Real

Done:

- Added `portal-view.js`, a CommonJS/browser-compatible rendering helper for portal project cards.
- Updated `portal.html` to load `portal-view.js`.
- Updated `portal.js` to use the helper and show better action errors.
- Expanded `/api/portal/actions?action=projects` to select revision and balance fields.
- Added `test/portal-view.test.js`.
- Expanded `test/portal-actions.test.js`.
- Added portal layout/status/balance/form styles in `style.css`.
- Marked Stage 2 complete in `docs/roadmap.md`.

Portal behavior now covered:

- Status labels and next-step copy.
- Final approval only appears when final delivery is ready and unlocked.
- Revision count appears.
- Revision form hides when no revisions remain.
- Balance due and locked final delivery display clearly.
- Empty project state gives useful next steps.
- Portal action failures show a status message.

### Stage 3: Build Josh's Operational Admin Dashboard

Done in the first Stage 3 slice:

- Added a protected `/api/admin/overview` endpoint.
- Added `getAdminOverview` and `buildAdminOverview` in `lib/db/studio-records.js`.
- The overview summarizes:
  - new leads
  - awaiting files
  - files submitted
  - active projects
  - open revision requests
  - finals ready
  - balances due
  - recent project events
- Updated `admin.html` and `admin.js` so the admin page opens with a studio operations overview.
- Kept the existing setup and sandbox tools on the same page under a dedicated `Setup & Sandbox` section.
- Added `test/admin-overview-api.test.js`.
- Added `api/admin/overview.js` to `npm run check:js`.

Done in the second Stage 3 slice:

- Added a protected `/api/admin/projects?action=detail&projectId=...` endpoint.
- Added `getAdminProjectDetail` and `buildAdminProjectDetail` in `lib/db/studio-records.js`.
- The project detail payload includes:
  - project summary and status
  - customer email/name
  - financial totals and balance
  - Drive project/upload/finals/final-delivery links
  - submitted project files
  - revision counts and revision requests
  - payments
  - project timeline events
  - email events
- Updated the admin overview priority queue with `View` actions for project-backed rows.
- Added a read-only project detail panel in `admin.html`/`admin.js`.
- Added project detail styles in `style.css`.
- Added `test/admin-project-detail-api.test.js`.
- Added `api/admin/projects.js` to `npm run check:js`.

## Verification Evidence

Before the latest push, these commands passed:

```bash
npm test
npm run check:js
git diff --check
```

Last observed `npm test` result:

- 109 tests
- 109 pass
- 0 fail

Browser visual verification was not completed because the Browser plugin's required Node REPL browser-control tool was not available in the session.

During the Stage 3 overview slice, these focused checks passed:

```bash
node --test test/admin-overview-api.test.js
node --check admin.js
node --check api/admin/overview.js
node --check lib/db/studio-records.js
```

These full checks also passed after the Stage 3 overview slice:

```bash
npm test
npm run check:js
git diff --check
```

Last observed `npm test` result after the overview slice:

- 114 tests
- 114 pass
- 0 fail

During the Stage 3 project detail slice, these focused checks passed:

```bash
node --test test/admin-project-detail-api.test.js
node --check admin.js
node --check api/admin/projects.js
node --check lib/db/studio-records.js
```

These full checks also passed after the Stage 3 project detail slice:

```bash
npm test
npm run check:js
git diff --check
```

Last observed `npm test` result after the project detail slice:

- 122 tests
- 122 pass
- 0 fail

## Important Implementation Notes

- The project is a static site plus Vercel Functions, not a framework app.
- `package.json` uses `"type": "commonjs"`.
- Tests use Node's built-in test runner: `node --test`.
- `check:js` is a long `node --check ...` command. Add new browser/server JS files to it.
- Current pushed Stage 3 commits:
  - `806fef8 feat: add admin operations overview`
  - `792a8ec feat: add admin project detail view`
- Supabase browser auth uses `SUPABASE_URL` and `SUPABASE_PUBLIC_KEY` from `/api/public/config`.
- Server-side Supabase writes use `SUPABASE_SERVICE_ROLE_KEY` or legacy `SUPABASE_SECRET_KEY`.
- Admin access is checked against `ADMIN_EMAIL`.
- Local admin bypass exists only when `ALLOW_LOCAL_ADMIN_BYPASS=1` and host is localhost/127.0.0.1.
- PayPal webhook automation creates paid projects, Drive folders, and emails upload instructions.
- The success page should remain portal/email-first, not `mailto:` first.
- The portal renderer lives in `portal-view.js`; keep state/rendering rules there and test them directly.
- `api/admin/overview.js` returns dashboard queue data.
- `api/admin/projects.js` currently supports read-only detail via `action=detail&projectId=...`.
- `admin.js` renders a same-page project detail panel from priority queue `View` buttons.
- `getAdminProjectDetail` includes project files linked by `project_id`, and also legacy files linked by `order_id` when the project has an order.
- Browser visual verification was blocked in this environment. Localhost binding failed with `EPERM`, and the in-app Browser control execution tool was not available.
- GitHub CLI exists but `gh auth status` reported an invalid stored token. Normal `git push origin main` worked after network permission.

## Recommended Next Work

Continue Stage 3 from `docs/roadmap.md`: Build Josh's Operational Admin Dashboard.

Suggested next Stage 3 slice:

1. Add admin status update action tests.
2. Add a protected status update handler for known project statuses.
3. Update the project detail panel with a status control.
4. Log a `project_events` row when status changes.
5. Keep admin notes, final delivery unlocks, and extra revision actions for later Stage 3 slices.

Recommended TDD pattern:

1. Write focused tests first.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the minimal helper/API/UI change.
4. Run the focused test.
5. Run `npm test`, `npm run check:js`, and `git diff --check`.

## Files Most Likely To Change Next

- `admin.html`
- `admin.js`
- `api/admin/projects.js`
- `lib/db/studio-records.js`
- `test/admin-project-detail-api.test.js`
- `style.css`
- `docs/roadmap.md`

## Known Follow-Up Decisions

- Decide whether the project detail selection should persist in the URL with a query string later. It is currently same-page state only.
- Decide whether to keep admin setup tools on the same page behind a section or split to a separate setup page later.
- Decide when to run the fresh-clone setup check. It is useful before another machine or deployment depends on the repo, but it is not blocking Stage 3.
- Replace WAV listen-section assets with MP3 previews later.
