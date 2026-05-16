# Dirt Cat Records PayPal Checkout Design

Date: 2026-05-16
Project: Dirt Cat Records checkout and service purchase flow
Status: Approved for implementation planning

## 1. Goal

Add a professional checkout flow that lets customers:

- understand exactly what they are buying
- select services and add-ons clearly
- see a full cost breakdown before payment
- pay quickly through PayPal
- submit full project intake after payment

The experience should feel clean, fast, and credible for first-time and repeat clients.

## 2. Current State

The current site is a static HTML/CSS/JS site hosted on Vercel.

Current purchase and lead handling:

- one hardcoded PayPal `webscr` form for the `$149 Starter Mix`
- one `mailto:` form for the free mix review
- no dedicated service catalog page
- no structured service breakdown
- no live price calculation
- no secure server-side validation of selected prices

This is adequate for a simple single-package offer but not for a professional multi-service checkout.

## 3. Product Direction

The new checkout should be a guided service builder rather than a loose cart.

Design principles:

- customer always understands what is included
- customer always sees exact pricing before payment
- checkout stays fast by collecting only light details before payment
- full project intake happens after payment
- PayPal handles payment entry and sensitive card data
- server validates all pricing and discount logic

## 4. Scope

### In scope for v1

- dedicated checkout page
- service selection
- song count selection
- add-on selection
- live visible price breakdown
- PayPal API checkout via Vercel Functions
- full-payment and deposit logic
- post-payment intake page
- security validation for price, discount, and order structure

### Out of scope for v1

- customer accounts
- upload hosting on Dirt Cat infrastructure
- automated file storage
- automated CRM integration
- automated invoice sync with third-party bookkeeping
- subscription billing
- negotiated quote workflow inside checkout

## 5. Customer Flow

### Pre-payment flow

1. Customer opens the checkout page.
2. Customer selects a base service.
3. Customer selects a song count.
4. Customer selects optional add-ons.
5. Customer sees a full pricing breakdown.
6. Customer enters lightweight project details.
7. Customer confirms purchase terms.
8. Customer pays through PayPal.

### Post-payment flow

1. Customer lands on a success/intake page.
2. Site shows purchase summary and payment status.
3. Customer submits:
   - stem upload link
   - rough mix link
   - reference tracks
   - mix notes
   - target deadline
   - notes about selected add-ons
4. Site confirms next steps and expected response/turnaround.

## 6. Information Collected

### Before payment

Required:

- customer name
- email
- artist or project name
- song title or project title
- selected service
- selected song count
- selected add-ons
- acknowledgment checkbox for turnaround, revisions, and deliverables

Optional:

- reference link
- short notes

### After payment

Required:

- stem delivery link
- rough mix link
- mix notes

Optional:

- reference tracks
- deadline
- add-on-specific notes

## 7. Service Catalog

### Base services

- Mix Only: `$149` per song
- Master Only: `$79` per song
- Mix + Master: `$199` per song
- Custom Project Deposit: used for larger or quoted work

### Add-ons priced per song

- Extra Revision: `$35`
- Light Vocal Tuning / Editing: `$50`
- Clean / Radio Edit: `$35`
- Instrumental / Acapella Export: `$25`
- Extra Stems: `$25` per additional 12 stems

### Add-ons priced per project

- Rush Delivery: `$75`
- Consultation Call: `$40`

## 8. Discount Rules

Discounts apply only to:

- Mix Only
- Master Only
- Mix + Master

Discounts do not apply to add-ons.

Song-count discount tiers:

- 1 song: 0% discount
- 2-4 songs: 10% discount
- 5-9 songs: 20% discount
- 10+ songs: 30% discount

Interpretation:

- the eligible service subtotal receives the tier discount based on total song count
- add-ons are calculated separately and added afterward

## 9. Payment Rules

- Orders under `$500`: full payment required
- Orders `$500+`: customer may choose full payment or 50% deposit
- 5+ song projects: deposit option should be shown automatically
- Custom Project Deposit flow is deposit-first by default

Deposit applies only to eligible project types. The backend decides whether deposit payment is allowed for a given order.

## 10. Pricing Examples

### Example A

2-song Mix Only order:

- base subtotal: `2 x $149 = $298`
- 10% discount on eligible subtotal: `-$29.80`
- total before add-ons: `$268.20`

### Example B

3-song Mix + Master order with rush delivery:

- base subtotal: `3 x $199 = $597`
- 10% discount: `-$59.70`
- discounted service subtotal: `$537.30`
- rush delivery: `$75`
- order total: `$612.30`
- deposit option allowed because total is above `$500`

## 11. UX Requirements

The checkout page must clearly communicate:

- what each base service includes
- revision count
- turnaround expectations
- stem assumptions and limits
- what add-ons do
- which add-ons are per song vs per project
- when discount tiers apply
- whether the customer is paying full amount or deposit

The price summary should always show:

- selected base service
- number of songs
- per-song rate
- discount tier and discount amount
- add-ons with quantity and pricing basis
- subtotal
- deposit or full-payment choice
- final amount due now

## 12. Technical Architecture

The site stays mostly static, but checkout uses Vercel Functions for secure PayPal integration.

### Frontend pages

- `checkout.html`: service builder and checkout page
- `success.html`: post-payment summary and intake page

### Frontend scripts

- `checkout.js`: handles service selection, add-on state, summary rendering, and PayPal button flow
- optional shared config module for display-only service metadata

### Backend routes

- `api/create-paypal-order.js`
- `api/capture-paypal-order.js`
- optional `api/checkout-config.js` if display config is served from backend

### Shared backend config

Server-side canonical configuration for:

- services
- add-ons
- song-count discount tiers
- deposit rules
- allowed combinations

The server is the source of truth for all pricing.

## 13. PayPal Integration

Use the PayPal JavaScript SDK on the frontend and PayPal Orders API through Vercel Functions on the backend.

Frontend responsibilities:

- collect selections
- send service IDs, add-on IDs, counts, and payment mode to backend
- render PayPal button

Backend responsibilities:

- validate request payload
- recalculate entire order from canonical server-side pricing
- create PayPal order with correct amount and metadata
- capture approved order
- verify payment result before returning success state

## 14. Security Requirements

### Credentials

- PayPal secret credentials must live only in Vercel environment variables
- no secret keys in frontend code

### Price integrity

- frontend may send selected IDs and counts only
- backend must ignore any client-supplied price values
- backend must recalculate subtotal, discounts, deposit amount, and final amount due

### Request validation

Backend must validate:

- allowed base service IDs
- allowed add-on IDs
- valid song counts
- per-song vs per-project add-on rules
- deposit eligibility
- discount tier eligibility
- minimum and maximum logical quantities

### Payment verification

- capture endpoint must verify PayPal order status
- success page must not trust query params alone for paid state
- backend response should contain validated purchase summary

### Abuse resistance

- add basic rate limiting or request throttling if feasible
- reject malformed payloads early
- do not expose private internal pricing metadata beyond what is needed

### Data handling

- no payment card data passes through Dirt Cat infrastructure
- intake page should collect file links, not uploads, in v1

## 15. Order Data Model

Minimum order payload from frontend to backend:

- baseServiceId
- songCount
- selectedAddOns
- paymentMode (`full` or `deposit`)
- lightweight customer/project info

Minimum validated order summary from backend:

- orderId
- base service label
- song count
- eligible subtotal
- discount tier
- discount amount
- add-on line items
- subtotal
- payment mode
- amount due now

## 16. Success Page Requirements

The success page should show:

- payment confirmation
- order summary
- amount paid
- remaining balance if deposit was chosen
- what happens next
- intake form for upload links and notes
- turnaround expectations
- contact fallback if the intake form fails

## 17. Content Requirements

The checkout page should include plain-language explanations for:

- Mix Only
- Master Only
- Mix + Master
- when to choose each
- what revisions mean
- what counts as a song
- what happens on deposit-based projects

The writing should sound specific and professional, not generic ecommerce copy.

## 18. Implementation Notes

This repo currently has no app framework or backend layer. The initial implementation should add only the minimum structure needed for Vercel Functions rather than converting the whole site to a larger framework.

Preferred v1 direction:

- keep existing static site pages
- add checkout page and success page as additional static HTML pages
- add small Node-based Vercel API routes for PayPal order creation/capture

## 19. Risks

- unclear rules around song count or add-on pricing can create customer confusion
- weak backend validation creates direct revenue/security risk
- deposit rules can become inconsistent if not enforced server-side
- too much pre-payment intake can slow conversion
- too little post-payment clarity can create fulfillment friction

## 20. Open Questions Resolved

- Hosting: Vercel
- Checkout type: PayPal API via backend
- Song support: multiple songs in one checkout
- Discount rules: tiered, only for mix/master work
- Add-ons: mixed per-song and per-project pricing
- Payment structure: full payment under `$500`, optional 50% deposit above `$500`
- Intake model: light details before payment, full intake after payment

## 21. Next Step

Create an implementation plan for:

- page structure
- service config/data model
- frontend calculation logic
- PayPal API routes
- success page and intake flow
- environment variable setup
- testing and verification
