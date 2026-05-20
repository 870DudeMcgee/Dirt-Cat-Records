# Deep Modules Architecture Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `using-superpowers` before starting and `executing-plans` while implementing this plan. Keep one task in progress at a time and update `docs/execution-log.md`, `docs/roadmap.md`, and `docs/agent-handoff.md` at each checkpoint.

**Goal:** deepen the workflow Modules that currently spread Project, Quote, Portal Action, follow-up, and event behavior across too many callers so the repo gains more leverage at each Interface and more locality for fixes.

**Design bias:** prefer deep Modules over thin wrappers or pass-through helpers. The Interface is the test surface. Use the deletion test before keeping any extracted Module: if deleting it would just inline the same caller knowledge, it is still shallow.

**Why this order:** Stage 7 launch hardening and the PayPal environment/webhook plan still come first because they close live-provider truth gaps. After that, deepen the highest-friction workflow seams from the inside out: payment transition policy, Project event schema, Quote lifecycle, Portal Action policy, then follow-up orchestration. Email sequencing stays last and conditional because the earlier Modules may absorb most of that current friction.

**Architecture:** this plan does not reopen the accepted ADRs for Checkout Payment, Quote Payment, Balance Payment, Delivery Lock, or Portal Action validation. It turns the remaining shallow workflow Modules into deeper Modules behind smaller Interfaces.

Related durable review: `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`

Related prerequisite plan: `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`

---

## Current Starting State

- The active delivery slice is still Stage 7 launch hardening.
- The ordered PayPal environment and webhook deepening plan is already documented and should stay ahead of this broader workflow-deepening plan.
- The repo should still be treated as operating at the Vercel Hobby function cap unless a fresh function-count check proves otherwise, so this plan must not add casual new Vercel Function entrypoints.
- The strongest current workflow friction is not missing helpers; it is that multiple callers still know too much about Project state transitions, Quote lifecycle rules, follow-up pipeline rules, and event shapes.
- The current domain language in `CONTEXT.md` is stable enough to name the target Modules as Project, Quote, Checkout Payment, Balance Payment, Delivery Lock, Final Delivery, and Portal Action Modules.

## Source Documents

- `README.md`
- `docs/roadmap.md`
- `docs/agent-handoff.md`
- `docs/execution-log.md`
- `docs/superpowers/specs/2026-05-20-architecture-readiness-review.md`
- `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
- `CONTEXT.md`
- `docs/adr/0001-paypal-metadata-versioning.md`
- `docs/adr/0002-payment-purpose-routing.md`
- `docs/adr/0003-delivery-lock-and-balance-gating.md`
- `docs/adr/0004-portal-action-validation.md`

## Acceptance Criteria

- Each implementation slice creates or deepens one owning Module with a smaller Interface than the current caller knowledge.
- Project status, Delivery Lock, Quote state, Portal Action eligibility, follow-up outcomes, and Project event shape stop being recomputed ad hoc across callers in the touched slice.
- Focused tests move toward exercising the owning Module Interface rather than reproducing orchestration through multiple mocks.
- No task in this plan adds a new Vercel Function entrypoint unless the same slice deletes or consolidates an existing one.
- Each task ends with focused tests plus `npm run check:js` and `git diff --check`.

## Deep-Module Rules During Execution

- Keep one deepening slice in progress at a time.
- Do not mix Stage 7 verification, PayPal environment work, and broad workflow deepening in the same step unless a failing validation proves they are the same seam.
- If a target Module needs a domain term that is not present in `CONTEXT.md`, update `CONTEXT.md` in the same slice before continuing.
- Prefer moving behavior behind an existing Seam before inventing another helper Module.
- If a refactor would widen a caller Interface just to make unit tests easier, stop and redesign the owning Module instead.

---

## Task 0: Keep Live-Provider Truth Ahead Of Workflow Deepening

**Files:**

- Inspect only: `docs/roadmap.md`, `docs/agent-handoff.md`, `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`, Vercel preview/prod state, PayPal verification evidence

- [ ] **Step 1: Confirm the Stage 7 and PayPal prerequisites are actually closed**

Before starting Task 1, confirm the current next action is no longer preview/provider verification and no longer a prerequisite item from the PayPal deepening plan.

- [ ] **Step 2: Choose one deepening slice only after the active runtime truth gap is closed**

Do not start payment-transition, Quote, follow-up, or Portal Action deepening while the next unresolved question is still “did the real provider path succeed?”

**Verification:**

```bash
git diff --check
```

---

## Task 1: Deepen The Project Payment Transition Module

**Files:**

- Add: `lib/automation/project-payment-transition.js`
- Modify: `lib/automation/studio-workflow.js`, `lib/automation/balance-payment-handler.js`, `lib/automation/delivery-lock.js`
- Modify tests: `test/studio-workflow.test.js`, `test/payment-router.test.js`, `test/balance-payment-validator.test.js`

- [x] **Step 1: Create one owning Module for Project financial transition policy**

Move Project status, amount-paid, balance-due, and Delivery Lock transition policy behind one Interface that accepts the current Project state plus the normalized payment input.

- [x] **Step 2: Migrate Checkout Payment, Quote Payment, and Balance Payment callers**

Keep callers focused on orchestration and persistence while the new Module decides status and lock outcomes.

- [x] **Step 3: Collapse shallow Delivery Lock helpers if they no longer earn their keep**

Run the deletion test against `lib/automation/delivery-lock.js`. Keep it only if it still provides leverage after the deeper payment-transition Module exists.

**Verification:**

```bash
node --test test/studio-workflow.test.js test/payment-router.test.js test/balance-payment-validator.test.js
npm run check:js
git diff --check
```

---

## Task 2: Deepen The Project Event Schema Module

**Files:**

- Add: `lib/automation/project-event-schema.js`
- Modify: `lib/automation/workflow-recorder.js`, `lib/db/studio-records.js`, `lib/automation/follow-up-dispatcher.js`, `api/portal/actions.js`, `lib/automation/studio-workflow.js`
- Modify tests: `test/studio-records.test.js`, `test/follow-up-dispatcher.test.js`, `test/portal-actions.test.js`, `test/studio-workflow.test.js`

- [x] **Step 1: Define the owning Project event Interface**

Create one Module that names canonical Project event types and normalizes event payload shape for payment, Quote, Portal Action, and follow-up flows.

- [x] **Step 2: Replace ad hoc event construction in callers**

Callers should stop assembling raw event payloads inline when they mean a known Project event.

- [x] **Step 3: Keep the recorder focused on sequencing, not event meaning**

If `workflow-recorder.js` still earns its keep after the event-schema Module exists, narrow it to ordered persistence operations and move event meaning into the schema Module.

**Verification:**

```bash
node --test test/studio-records.test.js test/follow-up-dispatcher.test.js test/portal-actions.test.js test/studio-workflow.test.js
npm run check:js
git diff --check
```

---

## Task 3: Deepen The Quote Lifecycle Module

**Files:**

- Add: `lib/automation/quote-lifecycle.js`
- Modify: `api/admin/quotes.js`, `api/portal/actions.js`, `lib/db/studio-records.js`, `lib/automation/studio-workflow.js`
- Modify tests: `test/admin-quotes-api.test.js`, `test/portal-accept-quote-api.test.js`, `test/studio-workflow.test.js`

- [x] **Step 1: Move Quote state transitions behind one Interface**

The owning Module should decide how a Quote moves through draft, sent, viewed, accepted, expired, or cancelled states and what Project mutation follows.

- [x] **Step 2: Keep admin and portal Adapters thin**

Admin quote creation/sending and portal quote acceptance should become Adapters over the same lifecycle Module rather than separate Implementations of Quote rules.

- [x] **Step 3: Preserve accepted ADR behavior while narrowing caller knowledge**

Do not reopen payment-purpose routing or metadata decisions here unless a focused validation proves Quote lifecycle work cannot proceed without it.

**Verification:**

```bash
node --test test/admin-quotes-api.test.js test/portal-accept-quote-api.test.js test/studio-workflow.test.js
npm run check:js
git diff --check
```

---

## Task 4: Deepen The Portal Action Policy Module

**Files:**

- Add: `lib/portal/action-policy.js`
- Modify: `lib/portal/action-rules.js`, `lib/portal/balance-payment-validator.js`, `api/portal/actions.js`
- Modify tests: `test/portal-action-rules.test.js`, `test/balance-payment-validator.test.js`, `test/portal-actions.test.js`

- [x] **Step 1: Create one owning policy Module for Portal Action eligibility**

The Interface should answer whether a Portal Action is visible, allowed, and why, while preserving ADR-0004’s dual-layer validation intent.

- [x] **Step 2: Keep two Adapters over one real Seam**

Client/shared rules and server validation should remain separate Adapters where needed, but they must draw from one owning policy Module so the Seam is real.

- [x] **Step 3: Add explicit parity tests**

Lock down that Portal Action visibility and server authority stay aligned for Balance Payment and Final Delivery approval behavior.

**Verification:**

```bash
node --test test/portal-action-rules.test.js test/balance-payment-validator.test.js test/portal-actions.test.js
npm run check:js
git diff --check
```

---

## Task 5: Deepen The Follow-Up Orchestration Module

**Files:**

- Add: `lib/automation/follow-up-orchestrator.js`
- Modify: `lib/automation/follow-up-selector.js`, `lib/automation/follow-up-dispatcher.js`, `lib/db/studio-records.js`, `api/cron/follow-ups.js`
- Modify tests: `test/follow-up-selector.test.js`, `test/follow-up-dispatcher.test.js`, `test/follow-up-cron-api.test.js`, `test/studio-records.test.js`

- [x] **Step 1: Create one owning follow-up pipeline Module**

Move candidate selection, queue intent, dispatch outcome, and retry/skip classification behind one Interface.

- [x] **Step 2: Keep persistence and transport as Adapters**

Supabase job persistence and email dispatch should remain Adapters at the Seam, while the orchestration Module owns the pipeline behavior.

- [x] **Step 3: Reduce mock-heavy caller tests**

Focused tests should exercise the follow-up orchestration Interface more than raw job-record plumbing.

**Verification:**

```bash
node --test test/follow-up-selector.test.js test/follow-up-dispatcher.test.js test/follow-up-cron-api.test.js test/studio-records.test.js
npm run check:js
git diff --check
```

---

## Task 6: Reassess Email Sequence Choreography Only If Friction Remains

**Files:**

- Conditional add: `lib/email/email-sequence-choreographer.js`
- Conditional modify: `lib/automation/studio-workflow.js`, `lib/automation/follow-up-dispatcher.js`, `api/portal/actions.js`, `lib/email/resend.js`
- Conditional tests: `test/studio-workflow.test.js`, `test/follow-up-dispatcher.test.js`, `test/resend-email.test.js`

- [x] **Step 1: Re-run the deletion test after Tasks 1 through 5**

If email sequencing complexity still lives across multiple callers after the deeper workflow Modules land, then create one owning email-sequence Module.

- [x] **Step 2: Keep template rendering separate from sequencing policy**

`lib/email/resend.js` should stay an Adapter for transport and template rendering, not the owner of workflow timing.

**Verification:**

```bash
node --test test/studio-workflow.test.js test/follow-up-dispatcher.test.js test/resend-email.test.js
npm run check:js
git diff --check
```

---

## Tracking Rules During Execution

- Keep `docs/roadmap.md` as the checklist source of truth for when this plan becomes the active slice.
- Keep `docs/agent-handoff.md` focused on the current next action and where this plan sits relative to Stage 7 and the PayPal plan.
- Keep `docs/execution-log.md` append-only with one bounded step per deepening slice.
- Update `README.md` when operator workflow or architecture source-of-truth links change.

## Risks And Rollback Notes

- Do not start Task 1 until live-provider truth and the PayPal environment plan stop being the controlling uncertainty.
- Do not merge two deepening tasks into one patch just because they touch adjacent files; that would widen the Interface under change and make validation ambiguous.
- If a task reveals an ADR conflict that is load-bearing rather than incidental, stop and record that decision before continuing with the broader plan.
