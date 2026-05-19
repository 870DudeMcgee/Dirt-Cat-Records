# ADR 0002: Payment Purpose Routing

## Status

Accepted

## Context

Payment behavior diverges by purpose:

- checkout creates new paid project workflows
- quote converts an existing quoted project
- balance updates an existing project's financial and delivery-lock state

Without a dedicated routing seam, purpose checks spread across handlers and webhook code.

## Decision

Use lib/paypal/payment-router.js as the central payment-purpose routing module.

Route at orchestration points:

- webhook parsing maps metadata to purpose-aware payment intent
- studio-workflow dispatches purpose-specific handling paths

## Consequences

Positive:

- Purpose branching is explicit and testable.
- Adding a new purpose requires extending one module interface.

Tradeoffs:

- Requires disciplined usage so direct ad-hoc purpose checks do not reappear.
