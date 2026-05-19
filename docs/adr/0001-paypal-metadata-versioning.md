# ADR 0001: PayPal Metadata Versioning

## Status

Accepted

## Context

The studio workflow supports three payment intents with different data requirements:

- checkout intent needs catalog and payment-mode details
- quote intent needs projectId and quoteId
- balance intent needs projectId and remaining-balance amount

The original compact format was checkout-only and insufficient for quote and balance data.

## Decision

Use versioned metadata formats in lib/paypal/order-metadata.js:

- v1 format remains supported for checkout metadata
- v2 format supports quote and balance metadata

v2 variants:

- quote: v2;q;projectId;quoteId;amountCents.totalCents
- balance: v2;b;projectId;amountCents.totalCents;

## Consequences

Positive:

- New intents can evolve without breaking v1 parsing.
- Webhook parsing can route by paymentPurpose with a single decode seam.

Tradeoffs:

- Decoder complexity increases because both versions must be maintained.
- Tests must cover both v1 and v2 to prevent regressions.
