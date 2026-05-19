# 2026-05-19 Architecture Alignment Cleanup Plan

## Goal

Bring runtime modules, tests, and documentation into a single coherent architecture model for Stage 5 completion and Stage 6 readiness.

## Decision Summary

1. Keep versioned PayPal metadata (v1 checkout, v2 quote/balance).
2. Keep payment-purpose routing as a first-class seam.
3. Keep delivery lock rules centralized by balance_due semantics.
4. Keep dual-layer portal validation (shared UX rules + server authority).
5. Require paymentPurpose metadata on payment-flow project events.
6. Finish the remaining Stage 5 business slice before any additional high-risk refactors.

Decision references:

- docs/adr/0001-paypal-metadata-versioning.md
- docs/adr/0002-payment-purpose-routing.md
- docs/adr/0003-delivery-lock-and-balance-gating.md
- docs/adr/0004-portal-action-validation.md

## Phase Plan

### Phase A: Source-Of-Truth Docs

- Add CONTEXT.md with domain terms and module seams.
- Add ADRs for metadata, routing, delivery-lock, and portal validation.
- Sync README.md, docs/roadmap.md, and docs/agent-handoff.md to current architecture and test baseline.

### Phase B: Drift Checks

- Verify each module in CONTEXT.md exists and has tests.
- Verify event metadata includes paymentPurpose for payment-flow events.
- Verify portal action rules and validator semantics remain aligned.

### Phase C: Remaining Stage 5 Slice

- Implement admin finals-ready action with balance-due email trigger.
- Add focused tests for admin endpoint and project event/email logging.
- Re-run full test + syntax checks.

### Phase D: Post-Stage-5 Reassessment

- Reassess Stage 6 follow-up architecture from completed Stage 5 runtime behavior.
- Keep only high-leverage refactors that reduce drift or repeated decision logic.

## Execution Order (Locked)

1. Keep shared payment-purpose routing authoritative at initiation and processing seams.
2. Keep Delivery Lock logic authoritative in one rules module and consume it consistently.
3. Keep portal dual-layer validation with server as authority.
4. Require paymentPurpose metadata for payment-flow events.
5. Complete remaining Stage 5 admin finals-ready plus balance-due email flow.

## Verification Gates

1. npm test
2. npm run check:js
3. git diff --check
4. Manual read-through: README + roadmap + handoff + CONTEXT + ADRs

## Exit Criteria

- Documentation reflects implemented architecture and current test baseline.
- Stage 5 has one clear remaining item with explicit implementation plan.
- Next agent can continue without reverse-engineering payment flow decisions.
