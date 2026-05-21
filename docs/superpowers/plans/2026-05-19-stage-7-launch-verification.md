# Stage 7 Launch Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish Dirt Cat Records Stage 7 by proving the live-provider launch path works end to end, restoring preview protection, and updating the launch docs.

**Architecture:** The feature code is already implemented through Stage 6 and local Stage 7 harness validation. This plan verifies deployed preview and production behavior against PayPal sandbox webhooks, Supabase Auth redirects, Google Drive sharing, Resend deliverability, and Vercel project protection without adding new runtime features unless verification exposes a defect.

**Tech Stack:** Static frontend, Vercel Functions, PayPal REST/Webhooks, Supabase Auth and database, Google Drive API, Resend, Vercel CLI/API, Node test runner.

---

## Current Starting State

- Working repo: `/Users/josh/Desktop/dirt_cat_records_website_final/Dirt-Cat-Records-latest`
- Branch: `main`
- Remote: `https://github.com/870DudeMcgee/Dirt-Cat-Records.git`
- Latest pulled commit: `1e9743b sync stage 7 preview handoff`
- Local validation: `npm run deploy:preflight` passes after the checkout-config test fixture fix in `test/paypal-api.test.js`.
- Known local change before executing this plan: `test/paypal-api.test.js`
- Latest preview from handoff: `https://dirt-cat-records-pvh5lrqj6-dirt-cat-records-projects.vercel.app`
- Preview protection is intentionally disabled for PayPal sandbox webhook testing.

## Source Documents

- `docs/agent-handoff.md`
- `docs/roadmap.md`
- `docs/execution-log.md`
- `README.md`
- `docs/deployment-preflight.md`

---

### Task 1: Lock The Local Baseline

**Files:**

- Modify: none expected
- Inspect: `test/paypal-api.test.js`

- [ ] **Step 1: Confirm repo status**

Run:

```bash
git status --short --branch
```

Expected:

```text
## main...origin/main
 M test/paypal-api.test.js
```

- [ ] **Step 2: Re-run deploy preflight**

Run:

```bash
npm run deploy:preflight
```

Expected:

```text
Vercel function count OK: 11/12
tests 204
pass 204
```

Also confirm `npm run check:js` and `git diff --check` complete with exit code `0`.

- [ ] **Step 3: Commit the test-fixture correction**

Run:

```bash
git add test/paypal-api.test.js
git commit -m "test: fix checkout config public env fixture"
```

Expected:

```text
[main <sha>] test: fix checkout config public env fixture
```

Do not push until the preview webhook verification path is clear, unless a new preview deployment is needed.

---

### Task 2: Verify Preview PayPal Sandbox Payment And Webhook

**Files:**

- Modify after verification: `docs/execution-log.md`
- Modify after verification: `docs/roadmap.md`
- Inspect if failure occurs: `api/create-paypal-order.js`, `api/webhooks/paypal.js`, `lib/paypal/webhook.js`, `lib/automation/studio-workflow.js`

- [ ] **Step 1: Confirm preview is publicly reachable**

Run:

```bash
curl -I -s https://dirt-cat-records-pvh5lrqj6-dirt-cat-records-projects.vercel.app/checkout.html
```

Expected:

```text
HTTP/2 200
```

- [ ] **Step 2: Confirm preview webhook route reaches the app**

Run:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://dirt-cat-records-pvh5lrqj6-dirt-cat-records-projects.vercel.app/api/webhooks/paypal
```

Expected:

```text
400
```

This confirms the request reaches the app route, not Vercel Authentication.

- [ ] **Step 3: Run one full PayPal sandbox checkout from preview**

Open:

```text
https://dirt-cat-records-pvh5lrqj6-dirt-cat-records-projects.vercel.app/checkout.html
```

Use PayPal sandbox buyer credentials from the PayPal Developer Dashboard. Complete a low-risk checkout using the preview deployment only.

Expected:

- The PayPal hosted page is `www.sandbox.paypal.com`.
- Checkout returns to the preview success page.
- The app receives the PayPal webhook.
- A project/payment record appears in Supabase for the sandbox transaction.
- Drive folder automation and Resend email behavior either complete or produce documented provider errors.

- [ ] **Step 4: Confirm webhook processing evidence**

Use the Vercel dashboard or CLI logs for the preview deployment and inspect `/api/webhooks/paypal` around the sandbox payment time.

Expected:

- PayPal signature validation succeeds.
- Completed capture event is parsed.
- Checkout Payment workflow runs.
- No `PAYPAL_WEBHOOK_ID` mismatch appears.

- [ ] **Step 5: Record the result**

Append a new step to `docs/execution-log.md` with:

- preview URL used
- approximate payment time
- PayPal sandbox transaction/order id if visible
- webhook result
- created Supabase project/payment identifiers if visible
- Drive and Resend outcomes
- cleanup status, if sandbox artifacts are removed

Update `docs/roadmap.md` Stage 7:

```markdown
- [x] Verify PayPal sandbox checkout and webhook end to end.
```

Only mark complete if the webhook was accepted and processed.

---

### Task 3: Verify Supabase Magic-Link Redirects On Production Domain

**Files:**

- Modify after verification: `docs/execution-log.md`
- Modify after verification: `docs/roadmap.md`
- Inspect if failure occurs: `portal.js`, `lib/auth/supabase-auth.js`, Supabase Auth URL settings

- [ ] **Step 1: Open production portal**

Open:

```text
https://www.dirtcatrecords.com/portal.html
```

Expected:

- Page loads with HTTP `200`.
- Magic-link form renders.

- [ ] **Step 2: Request a magic link**

Use the configured test customer inbox from the handoff or owner-controlled test inbox.

Expected:

- Supabase sends the magic-link email.
- Link redirects back to `https://www.dirtcatrecords.com/portal.html` or the configured production redirect URL.
- Browser receives an authenticated session.
- Portal calls return customer project data or the empty state, not auth errors.

- [ ] **Step 3: Record the result**

Append a new step to `docs/execution-log.md` with:

- inbox used, redacted if needed
- redirect URL behavior
- portal auth result
- any Supabase dashboard setting changed

Update `docs/roadmap.md` Stage 7:

```markdown
- [x] Verify Supabase magic link redirects on the production domain.
```

Only mark complete if the redirect lands on the production domain and portal API calls authenticate.

---

### Task 4: Verify Google Drive Sharing From A Real Stage 7 Artifact

**Files:**

- Modify after verification: `docs/execution-log.md`
- Modify after verification: `docs/roadmap.md`
- Inspect if failure occurs: `lib/google/drive.js`, `lib/automation/setup-checks.js`, Google Drive folder permissions

- [ ] **Step 1: Identify the latest sandbox-created Drive folder**

Use the folder from Task 2, or if Task 2 did not create one, use the successful local run noted in the handoff:

```text
dcrtest-sbx-20260519T113900-stage7c
```

Expected:

- Parent project folder exists under the configured `GOOGLE_DRIVE_PROJECTS_FOLDER_ID`.
- Upload/reference subfolders exist.

- [ ] **Step 2: Verify owner access**

Open the project folder as the owner account.

Expected:

- Owner can view and manage project folder.
- Folder names match the generated project code/customer context.

- [ ] **Step 3: Verify customer upload-folder sharing**

Use the generated upload folder link from the project record or email.

Expected:

- Intended customer/test account can access the upload folder.
- Access level matches workflow expectations for file upload.
- Unintended public access is not broader than intended.

- [ ] **Step 4: Record the result**

Append a new step to `docs/execution-log.md` with:

- project/test run id
- Drive folder path or redacted folder id
- owner access result
- customer/test account access result
- any permission changes made

Update `docs/roadmap.md` Stage 7:

```markdown
- [x] Verify Google Drive folder creation and sharing permissions.
```

Only mark complete if folder creation and sharing permissions are confirmed manually or through provider evidence.

---

### Task 5: Verify Resend Sender, Reply-To, And Deliverability

**Files:**

- Modify after verification: `docs/execution-log.md`
- Modify after verification: `docs/roadmap.md`
- Inspect if failure occurs: `lib/email/resend.js`, Resend domain settings, DNS records

- [ ] **Step 1: Confirm sender domain**

In Resend, verify:

```text
RESEND_FROM_EMAIL = Dirt Cat Records <studio@dirtcatrecords.com>
RESEND_REPLY_TO = studio@dirtcatrecords.com
```

Expected:

- `dirtcatrecords.com` domain is verified for sending.
- Required DNS records pass in Resend.

- [ ] **Step 2: Trigger a real workflow email**

Use either:

- the PayPal sandbox checkout from Task 2, or
- the admin owner-proof/sandbox path from README.

Expected:

- Email is accepted by Resend.
- Message lands in the intended test inbox.
- Reply-to is `studio@dirtcatrecords.com`.
- Message content points to the correct portal/upload flow.

- [ ] **Step 3: Record the result**

Append a new step to `docs/execution-log.md` with:

- Resend message id if available
- inbox provider used
- accepted/delivered result
- reply-to result
- any DNS/domain corrections made

Update `docs/roadmap.md` Stage 7:

```markdown
- [x] Verify Resend sender domain, reply-to, and deliverability.
```

Only mark complete if the email is accepted and observable in the recipient inbox or Resend delivery logs.

---

### Task 6: Restore Vercel Authentication For Preview

**Files:**

- Modify after verification: `docs/execution-log.md`
- Modify after verification: `docs/agent-handoff.md`
- Inspect if failure occurs: Vercel project settings

- [ ] **Step 1: Confirm PayPal webhook testing is done**

Check `docs/execution-log.md`.

Expected:

- Task 2 has a completed PayPal sandbox webhook result.
- No further external webhook deliveries need the preview URL to be public.

- [ ] **Step 2: Restore Vercel Authentication**

Use the Vercel dashboard or Vercel API to restore the previous deployment protection setting for the linked project.

Expected:

- Preview deployments require Vercel Authentication again.
- Production remains publicly accessible.

- [ ] **Step 3: Verify protection behavior**

Run:

```bash
curl -I -s https://dirt-cat-records-pvh5lrqj6-dirt-cat-records-projects.vercel.app/checkout.html
```

Expected:

- Response no longer behaves like an unauthenticated public app page.
- A browser without Vercel auth is gated by Vercel protection.

- [ ] **Step 4: Record the result**

Append a new step to `docs/execution-log.md` with:

- protection setting restored
- verification result
- any exception left in place

Update `docs/agent-handoff.md` to remove any statement that preview is intentionally public.

---

### Task 7: Final Launch Checklist Documentation

**Files:**

- Modify: `README.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/agent-handoff.md`
- Modify: `docs/execution-log.md`

- [ ] **Step 1: Update README launch checklist**

In `README.md`, update the launch checklist so it reflects verified Stage 7 state:

```markdown
- [x] Production public pages load on `https://www.dirtcatrecords.com`.
- [x] Production checkout config returns public PayPal and Supabase config.
- [x] Preview PayPal sandbox checkout and webhook have been verified end to end.
- [x] Supabase magic-link redirects have been verified on the production domain.
- [x] Google Drive project folder creation and sharing permissions have been verified.
- [x] Resend sender, reply-to, and deliverability have been verified.
- [x] Vercel preview protection has been restored after webhook testing.
- [x] `npm run deploy:preflight` passes.
```

Use unchecked boxes for any item still unverified.

- [ ] **Step 2: Update roadmap Stage 7**

In `docs/roadmap.md`, mark only proven items complete.

Expected final complete Stage 7 checklist:

```markdown
- [x] Run the admin sandbox test against real providers.
- [x] Verify PayPal sandbox checkout and webhook end to end.
- [x] Verify Supabase magic link redirects on the production domain.
- [x] Verify Resend sender domain, reply-to, and deliverability.
- [x] Verify Google Drive folder creation and sharing permissions.
- [x] Verify Vercel environment variables are set for production.
- [x] Document the launch checklist in `README.md`.
```

- [ ] **Step 3: Refresh handoff**

Update `docs/agent-handoff.md` so `Next Session Start Here` contains only unfinished items.

Expected if all prior tasks pass:

```markdown
## Next Session Start Here

1. Review launch checklist with Josh.
2. Push final Stage 7 documentation and test-fixture commit.
3. Decide whether to start the post-launch audio asset compression task.
```

- [ ] **Step 4: Run final verification**

Run:

```bash
npm run deploy:preflight
```

Expected:

```text
Vercel function count OK: 11/12
tests 204
pass 204
```

- [ ] **Step 5: Commit final Stage 7 docs**

Run:

```bash
git add README.md docs/roadmap.md docs/agent-handoff.md docs/execution-log.md docs/superpowers/plans/2026-05-19-stage-7-launch-verification.md
git commit -m "docs: finalize stage 7 launch checklist"
```

Expected:

```text
[main <sha>] docs: finalize stage 7 launch checklist
```

---

## Execution Notes

- Do not restore Vercel Authentication before the PayPal sandbox webhook is verified.
- Do not mark roadmap items complete based only on expected behavior; require observed provider evidence.
- Do not put secrets, full access tokens, or private customer data into docs.
- If any live-provider check fails, stop and document the exact provider error in `docs/execution-log.md` before changing code.
- If a code defect is found, write or update a failing test first, then make the smallest production fix.

## Completion Criteria

- PayPal sandbox checkout and webhook are verified on preview.
- Supabase magic link redirects are verified on production.
- Google Drive folder permissions are verified.
- Resend sender/reply-to/delivery are verified.
- Preview protection is restored.
- README, roadmap, handoff, and execution log agree.
- `npm run deploy:preflight` passes.
