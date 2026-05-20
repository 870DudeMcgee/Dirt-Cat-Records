# PayPal Environment And Webhook Deepening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `using-superpowers` before starting and `executing-plans` while implementing this plan. Keep one task in progress at a time and update `docs/execution-log.md`, `docs/roadmap.md`, and `docs/agent-handoff.md` at each checkpoint.

**Goal:** close the remaining Stage 7 PayPal sandbox webhook verification gap, then deepen the PayPal configuration and webhook seams so preview/live drift is easier to detect, test, and operate.

**Why this order:** the current strongest hypothesis is still external configuration drift, not conflicting repo code. The first task proves the live preview/sandbox path before code refactors begin. After that, the modules are deepened from the narrowest, highest-leverage PayPal seam outward: environment config, webhook identity, readiness, runtime lifecycle, then payment-purpose routing context.

**Architecture:** the existing Checkout Payment, Quote Payment, Balance Payment, Delivery Lock, and Portal Action seams already have central modules. This plan targets the remaining shallow PayPal environment and webhook seams without reopening the accepted ADRs unless implementation forces a new metadata decision.

Related durable review: `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`

**Tech Stack:** Vercel Functions, PayPal REST + webhooks, Supabase, Google Drive, Resend, static frontend, Node test runner.

---

## Current Starting State

- Working repo: `/Users/jewelbait/Desktop/DirtCatRecords`
- Branch: `main`
- Remote: `https://github.com/870DudeMcgee/Dirt-Cat-Records.git`
- Current baseline commit: `b9436bd`
- Repo state note: use `git status -sb` and `git log` as the source of truth for worktree cleanliness; status docs can lag behind `HEAD` while doc-state resync is in progress
- Known branch note: `studio-automation-system` exists as another branch pointer but is not checked out and does not affect `main`
- Stage 7 state: preview checkout reaches PayPal sandbox and returns to `success.html`; the unresolved proof gap is the real sandbox webhook/automation round-trip
- Documentation caveat: some historical `vercel.app` preview URLs remain in append-only history docs and older plan docs; they are not active runtime configuration
- Env-audit caveat: on this machine, `npx vercel env pull` can preserve key names while writing empty placeholders for pulled secrets, so use pulled files for key-presence/profile checks rather than proof that deployed secret values are populated
- Deployment caveat: treat the repo as operating at the Vercel Hobby function cap unless a fresh function-count check proves otherwise; do not add new API entrypoints casually during this plan

## Source Documents

- `README.md`
- `docs/roadmap.md`
- `docs/agent-handoff.md`
- `docs/execution-log.md`
- `docs/deployment-preflight.md`
- `CONTEXT.md`
- `docs/adr/0001-paypal-metadata-versioning.md`
- `docs/adr/0002-payment-purpose-routing.md`
- `docs/adr/0004-portal-action-validation.md`

## Acceptance Criteria

- One real preview sandbox checkout produces documented webhook-delivery evidence and a clear pass/fail result.
- PayPal environment selection, webhook identity, and readiness checks each have a single owning module.
- Setup checks and sandbox test mode stop encoding separate PayPal readiness rules.
- Preview/production invariants become explicit in code instead of being documented only in prose.
- Payment-purpose routing receives environment context without regressing Checkout Payment, Quote Payment, or Balance Payment behavior.
- Each task ends with focused tests plus `npm run check:js` and `git diff --check`.

---

## Task 0: Close The Real Sandbox Webhook Truth Gap

**Files:**

- Modify after verification: `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/execution-log.md`
- Inspect: PayPal Developer sandbox app/webhook settings, Vercel preview env values, preview deployment logs

- [ ] **Step 1: Capture the active preview webhook contract**

Confirm the currently intended preview deployment URL and the preview `PAYPAL_WEBHOOK_ID` value from Vercel. Then inspect the PayPal Developer sandbox app and record:

- webhook URL
- webhook id
- subscribed event types
- whether the webhook points at the public preview deployment

- [ ] **Step 2: Run one real sandbox checkout on preview**

Use the public preview checkout flow and a PayPal sandbox buyer account. Capture the approximate time plus any visible order/capture identifiers.

- [ ] **Step 3: Confirm delivery and processing evidence**

Use PayPal delivery history and preview logs to determine whether the event:

- reached `/api/webhooks/paypal`
- passed signature verification
- produced a Project/payment side effect
- failed because of an external config mismatch

- [ ] **Step 4: Clean misleading editable docs**

Remove or neutralize active-looking preview URL references from editable status docs after the active preview target is confirmed. Do not rewrite append-only history in `docs/execution-log.md`.

**Verification:**

```bash
git diff --check
```

If code changes are required to fix a proven defect, run only the focused tests for the touched PayPal modules before continuing.

---

## Task 1: Centralize PayPal Environment Configuration

**Files:**

- Add: `lib/paypal/environment-config.js`
- Modify: `lib/paypal/client-factory.js`, `lib/paypal/webhook.js`, `api/create-paypal-order.js`, `lib/automation/setup-checks.js`
- Modify tests: `test/paypal-client-factory.test.js`, `test/paypal-webhook.test.js`, `test/setup-checks.test.js`

- [ ] **Step 1: Add one PayPal environment configuration module**

Expose one Interface that returns validated PayPal runtime config for the active environment:

- environment name
- base URL
- client credential presence
- webhook id presence

- [ ] **Step 2: Migrate existing callers**

Update order creation, webhook verification, client creation, and setup checks to consume the shared module instead of reassembling PayPal env state independently.

- [ ] **Step 3: Add focused tests**

Cover sandbox/live selection, missing credential failures, and consistent base-url selection across callers.

**Verification:**

```bash
node --test test/paypal-client-factory.test.js test/paypal-webhook.test.js test/setup-checks.test.js
npm run check:js
git diff --check
```

---

## Task 2: Split Webhook Identity From Request Verification

**Files:**

- Add: `lib/paypal/webhook-verifier.js`
- Modify: `lib/paypal/webhook.js`, `api/webhooks/paypal.js`
- Modify tests: `test/paypal-webhook.test.js`, `test/paypal-webhook-route.test.js`

- [ ] **Step 1: Construct webhook identity up front**

Move webhook-id and environment validation into module construction so configuration failures happen before the first live webhook request.

- [ ] **Step 2: Keep runtime verification narrow**

Leave the request-time Interface responsible only for signature verification and completed-payment parsing.

- [ ] **Step 3: Add targeted failure-mode tests**

Cover missing webhook id, mismatched environment inputs, and successful verification through the route handler.

**Verification:**

```bash
node --test test/paypal-webhook.test.js test/paypal-webhook-route.test.js
npm run check:js
git diff --check
```

---

## Task 3: Unify PayPal Readiness Checks

**Files:**

- Add: `lib/paypal/readiness.js`
- Modify: `lib/automation/setup-checks.js`, `lib/automation/test-mode-runner.js`, `api/admin/setup-wizard.js`
- Modify tests: `test/setup-checks.test.js`, `test/test-mode-runner.test.js`, `test/admin-setup-api.test.js`

- [ ] **Step 1: Create one readiness module**

Define one Interface for "is PayPal ready for this runtime?" that setup checks and sandbox test mode both consume.

- [ ] **Step 2: Reuse the shared PayPal seams**

The readiness module should consume Task 1 and Task 2 seams rather than duplicating env/webhook validation.

- [ ] **Step 3: Align setup and sandbox outputs**

Ensure admin setup and sandbox test mode produce consistent readiness conclusions and diagnostics.

**Verification:**

```bash
node --test test/setup-checks.test.js test/test-mode-runner.test.js test/admin-setup-api.test.js
npm run check:js
git diff --check
```

---

## Task 4: Add Explicit Runtime Environment Lifecycle

**Files:**

- Add: `lib/env/runtime-environment.js`
- Modify: `lib/automation/business-config.js`, `lib/paypal/environment-config.js`, `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`
- Modify tests: `test/business-config.test.js`, `test/setup-checks.test.js`

- [ ] **Step 1: Define development/preview/production once**

Create one runtime-environment module that identifies the active deployment lifecycle and exposes explicit helpers for preview/production invariants.

- [ ] **Step 2: Wire shared config to the lifecycle module**

Use the runtime environment lifecycle where PayPal and business config need to reason about deployment mode.

- [ ] **Step 3: Document the invariants**

Update operator docs so preview/live separation is described as a code-backed rule, not just prose.

**Verification:**

```bash
node --test test/business-config.test.js test/setup-checks.test.js
npm run check:js
git diff --check
```

---

## Task 5: Extend Payment-Purpose Routing With Environment Context

**Files:**

- Modify: `lib/paypal/payment-router.js`, `lib/paypal/webhook.js`, `lib/paypal/order-metadata.js`
- Modify tests: `test/payment-router.test.js`, `test/paypal-webhook.test.js`
- Conditional docs: `docs/adr/0001-paypal-metadata-versioning.md` only if metadata format changes are required

- [ ] **Step 1: Add environment context to the routing seam**

Extend the routing Interface so Checkout Payment, Quote Payment, and Balance Payment decisions can also reason about active runtime environment.

- [ ] **Step 2: Keep current payment behavior stable**

Do not change the accepted payment-purpose semantics unless a new metadata requirement is proven necessary.

- [ ] **Step 3: Revisit metadata only if required**

If environment markers must become part of metadata, update ADR-0001 in the same slice before changing the format.

**Verification:**

```bash
node --test test/payment-router.test.js test/paypal-webhook.test.js
npm run check:js
git diff --check
```

---

## Tracking Rules During Execution

- Keep `docs/roadmap.md` as the checklist source of truth.
- Keep `docs/agent-handoff.md` focused on current repo state and exact next action.
- Keep `docs/execution-log.md` append-only with one bounded step per implementation slice.
- Update `README.md` when operator workflow or source-of-truth rules change.

## Risks And Rollback Notes

- Do not start Task 1 until Task 0 produces a clear webhook pass/fail record; otherwise diagnosis and refactor work will be mixed together.
- Preserve the current PayPal metadata contract unless Task 5 proves a change is necessary.
- If any refactor widens beyond the named files/tests for its task, stop and update this plan before continuing.
