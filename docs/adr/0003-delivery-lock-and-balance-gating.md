# ADR 0003: Delivery Lock And Balance Gating

## Status

Accepted

## Context

Final delivery access must remain locked while a project has unpaid balance.
Portal actions and workflow status transitions must apply the same business rule.

## Decision

Use balance_due as the source-of-truth signal:

- balance_due > 0 => final_delivery_locked = true
- balance_due = 0 => final_delivery_locked = false and project can move to paid/delivered depending on final delivery URL

Implement authoritative rules in lib/automation/delivery-lock.js and consume those rules from payment handlers.

## Consequences

Positive:

- Lock behavior is deterministic and auditable.
- Quote and balance payments resolve through the same lock/status policy.

Tradeoffs:

- Portal UX rule modules must stay aligned to the same semantics.
