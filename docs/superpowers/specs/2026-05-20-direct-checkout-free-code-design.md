# Dirt Cat Records Direct Checkout Free Code Design

Date: 2026-05-20
Project: Dirt Cat Records direct checkout friends/free project flow
Status: Approved design; ready for user review before implementation planning

## 1. Goal

Add a private discount-code path that lets Josh give trusted friends a code for free direct checkout service orders while preserving the normal project workflow.

The code should turn a new direct checkout order into a no-charge Project so friends can use the site as a convenient project-sharing and tracking portal. The system should still create the customer, order, payment record, Project, Project Events, Drive folders, and emails that a paid checkout creates.

## 2. Scope

### In scope

- direct checkout service orders from `checkout.html`
- optional discount-code entry in the direct checkout UI
- server-side validation of the free code
- no-charge order creation without PayPal
- normal paid Project automation after a valid no-charge checkout
- tests for pricing, API behavior, workflow records, and code secrecy

### Out of scope

- quote acceptance discounts
- balance payment discounts
- PayPal-hosted coupons or promotion codes
- public discount-code administration
- percentage or partial discounts
- usage limits, expiration dates, or per-customer restrictions
- custom admin UI for creating codes

## 3. Product Behavior

The checkout page will include an optional discount-code field near the order summary. When a customer enters the valid friends/free code, the order summary will show a 100% comp line and a due-now amount of `$0.00`.

For a valid code, the customer can submit the checkout without loading or using PayPal. After submission, the customer lands on the existing success page with a no-charge completion state and the same portal next steps a paid customer sees.

For an invalid code, the app should show a clear error and leave the normal PayPal checkout path available. Invalid codes must not reveal what the valid code is or whether the feature is configured.

## 4. Authorization And Secrecy

The valid code will live only in a server-side environment variable, named `FRIENDS_FREE_CHECKOUT_CODE`.

The code must not be returned from `/api/checkout-config`, embedded in browser JavaScript, checked only on the client, or stored in public docs beyond the environment variable name. Client-side UI may submit a candidate code, but the server is the authority.

Code comparison should normalize surrounding whitespace and use case-insensitive matching for customer convenience.

If `FRIENDS_FREE_CHECKOUT_CODE` is unset, the no-charge path is disabled and all code submissions are rejected.

## 5. Payment And Accounting Semantics

A free-code direct checkout is treated as a no-charge checkout, not as a PayPal payment.

The system should preserve the original catalog value in project/accounting fields:

- `projects.total_amount`: original calculated checkout total
- `projects.amount_paid`: `0.00`
- `projects.balance_due`: `0.00`
- `projects.final_delivery_locked`: `false`
- `orders.total_amount`: original calculated checkout total
- `orders.amount_due_now`: `0.00`
- `orders.remaining_balance`: `0.00`
- `payments.amount`: `0.00`
- `payments.payment_purpose`: `checkout`
- `payments.status`: `paid`

The order summary should include explicit no-charge metadata, such as:

- no-charge checkout flag
- original total
- applied comp label
- payment mode forced to `full`
- remaining balance forced to `0`

The system must not create a PayPal order, call PayPal capture, or require a PayPal transaction for this path. Internal synthetic identifiers may be used where existing database constraints require unique transaction/order ids.

## 6. Workflow Integration

The no-charge path should reuse the existing paid Project workflow as much as possible:

- upsert customer
- create order and payment records
- create paid Project
- create paid-project-created Project Event
- link order/payment to Project
- attach Google Drive folders
- send normal paid project intake emails

The project should be a `paid` Project because the friend is using a real service workflow, not requesting a free review lead.

The no-charge path should only alter payment source and amounts. It should not fork Drive, email, portal, or Project lifecycle behavior unless a test proves the existing paid workflow cannot cleanly represent a no-charge checkout.

## 7. UI Requirements

The checkout UI should remain a direct service builder. The discount-code field should be small and functional, not promotional.

Required states:

- blank code: normal pricing and PayPal checkout
- invalid code: inline error, normal checkout remains available
- valid code: comp line appears, due-now is `$0.00`, no-charge submit action appears
- order submitted: success page shows no-charge completion details

The UI must avoid saying or implying that quote or balance payments can be comped with this code.

## 8. Error Handling

Server errors should use generic customer-safe messages:

- invalid or disabled code: `Discount code is not valid.`
- invalid checkout payload: existing checkout validation messages
- workflow failure: `Unable to start no-charge checkout.`

Server logs may include sanitized operational context but must not log the submitted discount code.

If no-charge workflow creation partially fails after records are created, the behavior should follow the current paid workflow posture: keep the Project usable when downstream Drive/email automation fails, and record automation failures as Project Events where the existing workflow already does so.

## 9. Testing

Tests should cover:

- pricing summary preserves original total while no-charge amount due is zero
- a valid configured code creates a no-charge checkout without PayPal calls
- invalid or unset code is rejected
- code is not exposed by checkout config
- no-charge checkout feeds the existing paid Project workflow with `paid` Project type, zero balance, and unlocked delivery
- PayPal quote and balance payment behavior remains unchanged

## 10. Implementation Notes

The likely implementation shape is:

- add a checkout discount/no-charge helper under `lib/checkout`
- add a Vercel Function endpoint for direct no-charge checkout creation
- extend `checkout.js` to collect, validate, and submit the code
- extend the success page state to describe no-charge completion
- add tests before implementation changes

No schema migration should be required unless the existing order/payment constraints cannot represent synthetic no-charge checkout ids. If a schema change becomes necessary, it should be limited to explicitly supporting non-PayPal checkout references without weakening existing payment constraints.
