# Agent Handoff

This file is the working handoff for continuing Dirt Cat Records development after the roadmap, setup, success-flow, and portal-state checkpoints.

## Current Repo State

- Working repo: `/Users/jewelbait/Desktop/DirtCatRecords`
- Remote: `https://github.com/870DudeMcgee/Dirt-Cat-Records.git`
- Branch: `main`
- Latest pushed commit: `b0c30db feat: complete admin extra revision allowance action and sync docs (Stage 3 done, 143 tests pass)`
- Local git status at handoff update time: dirty with active Stage 4 quote slice changes.
- Commit email used for pushed work: `Josh Mclean <870DudeMcgee@users.noreply.github.com>`

Older local copies were archived under:

- `/Users/josh/Desktop/dirt_cat_records_website_final/ARCHIVED_OLD_REPOS_REVIEW_BEFORE_DELETE`

Do not use the archived folders for new work.

## Next Agent Start Here

1. Work only in `/Users/jewelbait/Desktop/DirtCatRecords`.
2. Start by reading `docs/roadmap.md` and this file.
3. Confirm `git status -sb` still shows the expected modified files on `main...origin/main` before continuing.
4. Stage 4 is complete. Continue with Stage 5: balance payments and delivery locks.
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

Done in the third Stage 3 slice:

- Added a protected `/api/admin/projects?action=status` POST action.
- Added `updateAdminProjectStatus` in `lib/db/studio-records.js`.
- Validated admin status updates against the project status values already allowed by `supabase/schema.sql`.
- Logged an `admin_status_updated` `project_events` row when status changes.
- Updated `admin.js` to render a status control in the project detail panel and refresh the overview after changes.
- Added active project rows to the admin priority queue so the UI matches the overview counts.
- Tightened admin link rendering so invalid URLs do not produce empty `href` actions.
- Expanded `test/admin-project-detail-api.test.js` with status update coverage.

Done in the fourth Stage 3 slice:

- Extended `getAdminProjectDetail` to include `admin_notes` records.
- Added `addAdminProjectNote` in `lib/db/studio-records.js`.
- Added a protected `/api/admin/projects?action=notes` POST action.
- Logged an `admin_note_added` `project_events` row when a private note is saved.
- Updated `admin.js` to render private note history and a note form in the project detail panel.
- Added note form styling in `style.css`.
- Expanded `test/admin-project-detail-api.test.js` with admin note coverage.

Done in the fifth Stage 3 slice:

- Added `updateAdminProjectDelivery` in `lib/db/studio-records.js`.
- Added a protected `/api/admin/projects?action=delivery` POST action.
- Saving a final delivery URL now moves projects into `finals_ready` or `balance_due` while keeping delivery locked.
- Unlocking delivery now requires a valid final delivery URL and zero balance, moves the project to `delivered`, logs a `final_delivery_unlocked` event, and sends the customer a final delivery email.
- Updated `admin.js` to render final delivery controls in the project detail panel.
- Added final delivery form styling in `style.css`.
- Expanded `test/admin-project-detail-api.test.js` with final delivery coverage.

Done in the sixth Stage 3 slice:

- Added `allowAdminExtraRevision` in `lib/db/studio-records.js`.
- Added a protected `/api/admin/projects?action=extra-revision` POST action.
- Allowing one extra revision now increments `extra_revisions_allowed` and logs an `admin_extra_revision_allowed` event.
- Updated `admin.js` to render an extra revision action in the project detail panel.
- Added extra revision action styling in `style.css`.
- Expanded `test/admin-project-detail-api.test.js` with extra revision coverage.

Done in the first Stage 4 slice:

- Added `createAdminQuote` and `sendAdminQuote` helpers in `lib/db/studio-records.js`.
- Added a protected `/api/admin/quotes` endpoint with `action=create` and `action=send` POST actions.
- Creating a quote now stores quote headers and line items, sets `projects.active_quote_id`, moves project status to `quoted`, and logs `admin_quote_created`.
- Sending a quote now updates quote status to `sent`, moves project status to `quote_sent`, sends the `quote_sent` Resend template, logs an `email_events` row, and logs `admin_quote_sent`.
- Added `test/admin-quotes-api.test.js` and expanded `test/studio-records.test.js` with quote helper coverage.
- Added `api/admin/quotes.js` to `npm run check:js`.

Done in the remaining Stage 4 slices:

- Extended admin quote creation in `lib/db/studio-records.js` so quotes can build line items from catalog pricing and manual adjustments.
- Added quote retrieval/update helpers in `lib/db/studio-records.js` for portal quote surfaces.
- Updated `api/portal/actions.js` to include active quote and quote line-item data in projects responses.
- Added `api/portal/accept-quote.js` to start authenticated quote checkout and return a PayPal approval URL.
- Updated `portal-view.js`, `portal.js`, and `style.css` to render quote cards and support quote payment starts.
- Extended `lib/paypal/order-metadata.js`, `api/create-paypal-order.js`, and `lib/paypal/webhook.js` for quote payment metadata and webhook parsing.
- Extended `lib/automation/studio-workflow.js` to convert quoted projects correctly after quote payment confirmation.
- Added quote completion coverage in `test/portal-accept-quote-api.test.js`, `test/paypal-api.test.js`, `test/paypal-webhook.test.js`, `test/studio-workflow.test.js`, `test/portal-view.test.js`, `test/portal-actions.test.js`, and `test/studio-records.test.js`.

## Verification Evidence

Current verified commands in this workspace:

```bash
npm test
npm run check:js
git diff --check
```

Browser visual verification has still not been completed in this workspace.

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

Last observed `npm test` result in this workspace:

- 160 tests
- 160 pass
- 0 fail

Focused checks that passed during the extra revision slice:

```bash
node --test test/admin-project-detail-api.test.js
node --check admin.js
```

Full checks that passed after the extra revision slice:

```bash
npm test
npm run check:js
git diff --check
```

Focused checks that passed during the first Stage 4 quote slice:

```bash
node --test test/studio-records.test.js test/admin-quotes-api.test.js
```

Full checks that passed after the first Stage 4 quote slice:

```bash
npm test
npm run check:js
git diff --check
```

Focused checks that passed during Stage 4 completion:

```bash
node --test test/paypal-api.test.js test/paypal-webhook.test.js test/studio-workflow.test.js test/portal-view.test.js test/portal-actions.test.js test/portal-accept-quote-api.test.js test/studio-records.test.js
```

Full checks that passed after Stage 4 completion:

```bash
npm test
npm run check:js
git diff --check
```

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
- `api/admin/projects.js` now supports read-only detail, admin status updates, private note creation, final delivery updates, and extra revision allowance.
- `api/admin/quotes.js` now supports `action=create` and `action=send` for owner-only quote workflows.
- `api/portal/accept-quote.js` starts quote checkout for authenticated project owners and returns PayPal approval URLs.
- Quote payment metadata now supports checkout and quote payments in `lib/paypal/order-metadata.js`.
- Quote payment confirmations in `lib/automation/studio-workflow.js` now mark quotes accepted and convert projects into paid state.
- `admin.js` renders a same-page project detail panel from priority queue `View` buttons and allows owner-only status changes, private notes, final delivery actions, and extra revision allowance from that panel.
- `getAdminProjectDetail` includes project files linked by `project_id`, and also legacy files linked by `order_id` when the project has an order.
- `getAdminProjectDetail` now also includes private admin notes from `admin_notes`.
- Unlocking final delivery sends the `final_delivery_unlocked` email template and logs an `email_events` row.
- Browser visual verification remains unverified in this workspace.
- GitHub CLI exists but `gh auth status` reported an invalid stored token. Normal `git push origin main` worked after network permission.

## Recommended Next Work

Suggested next work:

1. Add a balance payment endpoint and portal balance payment action.
2. Extend PayPal metadata/webhook behavior for balance payments.
3. Keep final delivery locked until the balance is paid, then unlock on full payment.

Recommended TDD pattern:

1. Write focused tests first.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the minimal helper/API/UI change.
4. Run the focused test.
5. Run `npm test`, `npm run check:js`, and `git diff --check`.

## Files Most Likely To Change Next

- `portal-view.js`
- `portal.js`
- `api/portal/accept-quote.js`
- `api/create-paypal-order.js`
- `api/webhooks/paypal.js`
- `api/portal/actions.js`
- `lib/paypal/order-metadata.js`
- `lib/automation/studio-workflow.js`
- `lib/db/studio-records.js`
- `test/portal-actions.test.js`
- `test/portal-accept-quote-api.test.js`
- `test/paypal-api.test.js`
- `test/paypal-webhook.test.js`
- `docs/roadmap.md`

## Known Follow-Up Decisions

- Decide whether the project detail selection should persist in the URL with a query string later. It is currently same-page state only.
- Decide whether to keep admin setup tools on the same page behind a section or split to a separate setup page later.
- Decide when to run the fresh-clone setup check. It is useful before another machine or deployment depends on the repo, but it is not blocking Stage 3.
- Replace WAV listen-section assets with MP3 previews later.
