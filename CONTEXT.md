# Dirt Cat Records

This context defines canonical studio workflow language for Dirt Cat Records so payment, delivery, and portal decisions use the same terms.

## Language

**Project**:
A customer work item tracked from intake through final delivery and approval.
_Avoid_: Job, ticket

**Quote**:
A proposed paid scope for a Project that must be accepted before quote payment conversion.
_Avoid_: Estimate, proposal (as primary term)

**Checkout Payment**:
The initial direct checkout payment that creates a paid Project workflow.
_Avoid_: Order payment (ambiguous), purchase

**Quote Payment**:
The payment tied to accepting a Quote and converting the related Project to paid state.
_Avoid_: Deposit payment (when quote intent is meant)

**Balance Payment**:
The remaining payment for an existing Project with outstanding balance.
_Avoid_: Final payment (unless explicitly defined as synonym)

**Delivery Lock**:
The rule that final files stay inaccessible while a Project has balance due.
_Avoid_: Final gate, payout lock

**Final Delivery**:
The customer-accessible final files for a Project after Delivery Lock conditions are satisfied.
_Avoid_: Final upload, completion package

**Portal Action**:
A customer-triggered action in the portal such as pay balance, submit links, request revision, or approve finals.
_Avoid_: Button flow, user action (too generic)

## Relationships

- A **Project** can have zero or one active **Quote** at a time
- A **Quote Payment** converts a quoted **Project** into paid state
- A **Balance Payment** reduces Project balance and may clear **Delivery Lock**
- **Final Delivery** is available only when **Delivery Lock** conditions are satisfied
- A **Portal Action** is allowed only when the current **Project** state permits it

## Example Dialogue

> **Dev:** "If a customer pays from the portal, is that always a Checkout Payment?"
> **Domain expert:** "No. Portal payments for existing work are Balance Payments, while new direct checkout creates a Checkout Payment."

## Flagged Ambiguities

- "payment" was used ambiguously for checkout, quote, and balance; resolved into **Checkout Payment**, **Quote Payment**, and **Balance Payment**.
- "finals" was used ambiguously for locked and unlocked states; resolved into **Final Delivery** controlled by **Delivery Lock**.
