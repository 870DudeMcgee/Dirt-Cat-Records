# Architecture Readiness Review

Date: 2026-05-20
Scope: repo state, documentation hygiene, and the remaining architecture gaps that can slow or block Stage 7 launch hardening and the PayPal deepening plan.

## Why This Exists

This repo had two distinct kinds of friction:

1. Source-of-truth drift across `README.md`, `docs/roadmap.md`, `docs/agent-handoff.md`, and plan docs.
2. Shallow PayPal and runtime seams that make preview/live drift harder to detect before a real provider request.

This document is the stable architecture and readiness reference for those issues. Use it when the question is not "what happened in order" but "what currently matters and why."

## Verified Baseline

- The current codebase passes `npm run deploy:preflight`.
- Stage 0 through Stage 6 are implemented and covered by the existing automated suite.
- The local Stage 7 `v1-usability` sandbox path passes end to end against the real Supabase, Google Drive, and Resend integrations plus sandbox-like PayPal events.
- The unresolved Stage 7 proof gap is still the real PayPal sandbox webhook and automation round-trip on preview.
- The deploy guardrail currently passes at the Vercel Hobby limit, not below it. Operationally, this repo should be treated as `12/12` until a fresh function-count check proves otherwise.
- The previous documentation drift was primarily caused by freezing ephemeral facts such as preview URLs, exact worktree cleanliness, and point-in-time commit hashes into multiple editable docs.

## Documentation Map

Use the smallest doc that actually owns the fact you need.

- `README.md`
  Purpose: operator workflow, setup rules, runtime commands, and high-level current state.
- `docs/roadmap.md`
  Purpose: staged checklist source of truth and the currently active delivery slice.
- `docs/agent-handoff.md`
  Purpose: current repo state, exact next action, and session-start guidance for the next worker.
- `docs/execution-log.md`
  Purpose: append-only history of bounded implementation steps and validations.
- `docs/superpowers/plans/2026-05-20-paypal-environment-deepening-plan.md`
  Purpose: ordered implementation plan after the Stage 7 webhook truth gap is closed.
- `CONTEXT.md` and `docs/adr/`
  Purpose: domain language and accepted architectural decisions.
- This document
  Purpose: durable gap register for the current architecture and the anti-drift rules that keep the docs indexable.

## Anti-Drift Rules

- Do not freeze a preview deployment URL into more than one editable doc. Keep the active target in the handoff or execution log, and verify it from Vercel before using it.
- Do not treat prose as the source of truth for worktree cleanliness or the latest pushed commit. Use `git status -sb` and `git log -1 --oneline`.
- If operator workflow changes, update `README.md`, `docs/roadmap.md`, and `docs/agent-handoff.md` in the same slice.
- If the next action changes, update `docs/agent-handoff.md` and `docs/roadmap.md` together.
- If a step is historical evidence, log it in `docs/execution-log.md` rather than expanding status prose elsewhere.

## Current Blockers To Progress

1. The Stage 7 real sandbox webhook truth gap is still open.
   Until one preview checkout produces a documented pass or fail record through `/api/webhooks/paypal`, the repo still lacks external-truth proof for the live provider path.

2. PayPal environment selection is not owned by one module.
   Sandbox/live decisions are duplicated across callers, which lowers locality and makes drift harder to test.

3. Webhook identity is discovered at request time.
   Missing or mismatched webhook configuration still surfaces too late, during the first real webhook request.

4. PayPal readiness is not owned by one module.
   Setup checks, business config, and sandbox test mode each know part of the rule set.

5. Runtime lifecycle invariants are mostly documented, not encoded.
   Preview versus production expectations are enforced in scripts and prose more than in a central runtime module.

6. The deployment seam has no headroom.
   New API entrypoints are a real delivery risk because the repo is already operating at the Hobby function cap.

## Deepening Opportunities

### 1. Centralize PayPal Environment Configuration

Files:

- `lib/paypal/client-factory.js`
- `lib/paypal/webhook.js`
- `api/create-paypal-order.js`
- `lib/automation/setup-checks.js`

Problem:

- The PayPal environment seam is shallow.
- Base URL and environment selection are assembled in multiple places.
- Preview/live drift can pass through tests until a real request proves the mismatch.

Solution:

- Add one PayPal environment module that owns environment selection, base URL selection, and credential-presence diagnostics.

Benefits:

- Better locality for sandbox/live changes.
- More leverage for tests, setup checks, and webhook handling.
- Lower risk of environment drift reappearing across callers.

### 2. Split Webhook Identity From Request Verification

Files:

- `lib/paypal/webhook.js`
- `api/webhooks/paypal.js`

Problem:

- Webhook identity and request verification currently share one seam.
- Missing `PAYPAL_WEBHOOK_ID` is discovered during a live webhook request instead of at module construction time.

Solution:

- Construct webhook identity up front and keep runtime verification narrow.

Benefits:

- Better locality for configuration failures.
- Cleaner test surface between configuration validity and request validity.
- Stronger readiness checks before running external-provider verification.

### 3. Unify PayPal Readiness

Files:

- `lib/automation/setup-checks.js`
- `lib/automation/business-config.js`
- `lib/automation/test-mode-runner.js`
- `api/admin/setup-wizard.js`

Problem:

- The repo has payment env checks, secret-presence checks, and sandbox assumptions, but no single readiness module.
- The interface is spread across modules, so callers must know too much.

Solution:

- Add one readiness module that answers "is PayPal ready for this runtime?" and exposes shared diagnostics.

Benefits:

- More leverage for setup and sandbox flows.
- Better locality when provider rules change.
- Less risk that setup wizard and sandbox mode drift apart.

### 4. Deepen The Runtime Lifecycle Seam

Files:

- `lib/env/runtime.js`
- `lib/automation/business-config.js`
- future `lib/env/runtime-environment.js`

Problem:

- The current runtime module mostly loads env files.
- It fails the deletion test because the real lifecycle complexity does not disappear with it.

Solution:

- Replace the shallow runtime helper with a module that owns development, preview, and production lifecycle rules.

Benefits:

- Better locality for deployment-mode invariants.
- Clearer leverage for PayPal environment selection and operator workflow rules.

### 5. Extend Payment-Purpose Routing With Environment Context

Files:

- `lib/paypal/payment-router.js`
- `lib/paypal/webhook.js`
- `lib/automation/studio-workflow.js`

Problem:

- The current payment-purpose seam is accepted and useful, but it cannot yet carry runtime environment context.
- If preview/live-specific routing rules emerge, callers will need ad hoc branching unless the seam is deepened.

Solution:

- Extend the routing interface only after environment, webhook identity, and readiness seams are deepened.

Benefits:

- Keeps Checkout Payment, Quote Payment, and Balance Payment behavior stable now.
- Preserves leverage for future environment-aware routing without reopening accepted ADRs early.

### 6. Protect The Deployment Seam From New API Sprawl

Files:

- `api/`
- `package.json`
- `.husky/pre-push`
- `docs/deployment-preflight.md`

Problem:

- The deploy guardrail is working, but there is no function-count headroom.
- A casual new Vercel Function file can block deployment progress immediately.

Solution:

- Treat new API entrypoints as exceptional work that must delete or consolidate an existing entrypoint in the same slice.

Benefits:

- Better locality for deployment-risk decisions.
- Fewer surprise blockers during Stage 7 and follow-on work.

## Recommended Order

1. Close the real sandbox webhook truth gap from preview.
2. Clean any remaining misleading active-preview references in editable docs.
3. Execute the PayPal deepening plan in order: environment config, webhook identity, readiness, runtime lifecycle, then payment-purpose context.
4. Avoid new API entrypoints unless the same slice also reduces function-count pressure.

## What Should Not Be Re-Litigated

- `docs/adr/0001-paypal-metadata-versioning.md`
- `docs/adr/0002-payment-purpose-routing.md`
- `docs/adr/0003-delivery-lock-and-balance-gating.md`
- `docs/adr/0004-portal-action-validation.md`

Those ADRs already define the accepted seams for Checkout Payment, Quote Payment, Balance Payment, Delivery Lock, and Portal Action behavior. The current work is to deepen the remaining shallow seams around environment, readiness, and webhook verification.
