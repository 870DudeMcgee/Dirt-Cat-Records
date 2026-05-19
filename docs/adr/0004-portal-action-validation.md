# ADR 0004: Portal Action Validation

## Status

Accepted

## Context

Portal actions need both security validation and clear UX behavior.
Client-only checks are insufficient for ownership/security.
Server-only checks can produce confusing UX if buttons are always visible.

## Decision

Use dual-layer validation:

- client/shared rules for action visibility and UX guidance
- server validator as authoritative gate for project ownership and payment eligibility

Key modules:

- lib/portal/action-rules.js
- lib/portal/balance-payment-validator.js

## Consequences

Positive:

- Better UX with context-aware action visibility.
- Security enforced server-side regardless of client state.

Tradeoffs:

- Rule drift risk exists and requires tests to keep both layers aligned.
