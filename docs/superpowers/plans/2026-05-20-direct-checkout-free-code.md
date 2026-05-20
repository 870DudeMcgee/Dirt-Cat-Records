# Direct Checkout Free Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private server-validated free-code path for direct checkout orders that creates normal paid Projects without PayPal.

**Architecture:** Keep the existing 12 Vercel Function count intact by extending `api/create-paypal-order.js` with a no-charge branch instead of adding a new API file. Add a focused checkout helper in `lib/checkout/free-code.js` that validates `FRIENDS_FREE_CHECKOUT_CODE`, builds synthetic no-charge payment input, and preserves original catalog value while forcing amount due and balance to zero. Reuse `createPaidProjectWorkflow` so customers, orders, payments, Projects, Drive folders, emails, and Project Events follow the current paid-project path.

**Tech Stack:** Static HTML/CSS/JS, Node CommonJS Vercel Functions, PayPal checkout helpers, Supabase persistence helpers, Node `node:test`.

---

## File Structure

- Create `lib/checkout/free-code.js`: owns free-code normalization, validation, and conversion from direct checkout payload to paid-workflow input.
- Modify `api/create-paypal-order.js`: add a `paymentMethod: "no_charge"` branch that validates the code and invokes `createPaidProjectWorkflow`; keep PayPal order creation unchanged for normal checkout and quote payments.
- Modify `checkout.html`: add the optional discount-code controls inside the checkout summary.
- Modify `checkout.js`: track the discount code, render comp summary state, submit no-charge checkout, and keep PayPal as the default when no valid code is applied.
- Modify `success.html`: add stable ids so `success.js` can adjust copy for no-charge completion.
- Modify `success.js`: render a no-charge completion summary when the stored order summary has `noChargeCheckout`.
- Modify `style.css`: style the compact discount-code controls and no-charge submit button using existing checkout visual language.
- Modify `package.json`: add `lib/checkout/free-code.js` to `check:js` without removing existing local-reference check changes.
- Test `test/free-code.test.js`: validates helper behavior and accounting semantics.
- Modify `test/paypal-api.test.js`: covers route behavior, config secrecy, and unchanged PayPal paths.
- Modify `test/studio-workflow.test.js`: proves no-charge input produces a paid Project with zero amount paid, zero balance, and unlocked delivery.
- Modify `test/success-page.test.js`: ensures success page has no-charge-rendering anchors while preserving portal-first behavior.

## Task 1: Add Free-Code Helper

**Files:**
- Create: `lib/checkout/free-code.js`
- Create: `test/free-code.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing helper tests**

Create `test/free-code.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildNoChargeCheckoutPayment,
  validateFreeCheckoutCode,
} = require("../lib/checkout/free-code");

const checkoutInput = Object.freeze({
  baseServiceId: "mixMaster",
  songCount: 2,
  selectedAddOns: [{ addOnId: "rushDelivery", quantity: 1 }],
  paymentMode: "deposit",
  discountCode: " friends2026 ",
  customer: {
    name: "Buyer Friend",
    email: "Friend@Example.com",
    projectName: "Friend EP",
    songTitle: "Song One",
    referenceLink: "https://example.com/reference",
  },
});

test("validateFreeCheckoutCode accepts configured code with whitespace and case differences", () => {
  assert.equal(
    validateFreeCheckoutCode(" friends2026 ", {
      FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026",
    }).ok,
    true
  );
});

test("validateFreeCheckoutCode rejects missing or invalid code without exposing configured value", () => {
  assert.deepEqual(validateFreeCheckoutCode("friends2026", {}), {
    ok: false,
    error: "Discount code is not valid.",
  });
  assert.deepEqual(
    validateFreeCheckoutCode("wrong", {
      FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026",
    }),
    {
      ok: false,
      error: "Discount code is not valid.",
    }
  );
});

test("buildNoChargeCheckoutPayment preserves catalog value and forces zero due", () => {
  const payment = buildNoChargeCheckoutPayment(checkoutInput, {
    env: { FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026" },
    idFactory: () => "free-checkout-123",
  });

  assert.equal(payment.paymentPurpose, "checkout");
  assert.equal(payment.paypalTxnId, "NOCHARGE-free-checkout-123");
  assert.equal(payment.paypalOrderId, "NOCHARGE-free-checkout-123");
  assert.equal(payment.buyerEmail, "friend@example.com");
  assert.equal(payment.buyerName, "Buyer Friend");
  assert.equal(payment.artistName, "Friend EP");
  assert.equal(payment.projectTitle, "Song One");
  assert.equal(payment.totalAmount, "433.20");
  assert.equal(payment.amountDueNow, "0.00");
  assert.equal(payment.remainingBalance, "0.00");
  assert.equal(payment.status, "paid");
  assert.equal(payment.orderSummary.noChargeCheckout, true);
  assert.equal(payment.orderSummary.noChargeReason, "friends_free_code");
  assert.equal(payment.orderSummary.noChargeLabel, "Friends comp");
  assert.equal(payment.orderSummary.originalTotalCents, 43320);
  assert.equal(payment.orderSummary.totalCents, 43320);
  assert.equal(payment.orderSummary.amountDueNowCents, 0);
  assert.equal(payment.orderSummary.remainingBalanceCents, 0);
  assert.equal(payment.orderSummary.paymentMode, "full");
  assert.equal(payment.rawPayload.source, "friends_free_checkout");
});

test("buildNoChargeCheckoutPayment rejects invalid code and customer fields", () => {
  assert.throws(
    () =>
      buildNoChargeCheckoutPayment(
        { ...checkoutInput, discountCode: "wrong" },
        { env: { FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026" } }
      ),
    /Discount code is not valid/
  );

  assert.throws(
    () =>
      buildNoChargeCheckoutPayment(
        {
          ...checkoutInput,
          customer: { ...checkoutInput.customer, email: "bad-email" },
        },
        { env: { FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026" } }
      ),
    /A valid customer email is required/
  );
});
```

- [ ] **Step 2: Run the helper tests to verify they fail**

Run:

```bash
node --test test/free-code.test.js
```

Expected: FAIL with `Cannot find module '../lib/checkout/free-code'`.

- [ ] **Step 3: Implement `lib/checkout/free-code.js`**

Create `lib/checkout/free-code.js`:

```js
const { randomUUID } = require("node:crypto");
const { calculateOrder, centsToDollars } = require("./pricing");

const INVALID_CODE_MESSAGE = "Discount code is not valid.";

function normalizeFreeCheckoutCode(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validateFreeCheckoutCode(candidateCode, env = process.env) {
  const configuredCode = normalizeFreeCheckoutCode(
    env.FRIENDS_FREE_CHECKOUT_CODE
  );
  const candidate = normalizeFreeCheckoutCode(candidateCode);

  if (!configuredCode || !candidate || configuredCode !== candidate) {
    return { ok: false, error: INVALID_CODE_MESSAGE };
  }

  return { ok: true };
}

function buildNoChargeCheckoutPayment(input, options = {}) {
  const env = options.env || process.env;
  const validation = validateFreeCheckoutCode(input?.discountCode, env);
  if (!validation.ok) throw new Error(validation.error);

  const customer = normalizeCustomer(input?.customer || {});
  const orderSummary = calculateOrder({
    baseServiceId: input.baseServiceId,
    songCount: input.songCount,
    selectedAddOns: input.selectedAddOns || [],
    paymentMode: "full",
  });

  const idFactory = options.idFactory || (() => randomUUID());
  const syntheticId = `NOCHARGE-${idFactory()}`;
  const noChargeSummary = {
    ...orderSummary,
    paymentMode: "full",
    depositAllowed: false,
    noChargeCheckout: true,
    noChargeReason: "friends_free_code",
    noChargeLabel: "Friends comp",
    originalTotalCents: orderSummary.totalCents,
    amountDueNowCents: 0,
    remainingBalanceCents: 0,
  };

  return {
    paymentPurpose: "checkout",
    paypalTxnId: syntheticId,
    paypalOrderId: syntheticId,
    buyerEmail: customer.email,
    buyerName: customer.name,
    artistName: customer.projectName,
    projectTitle: customer.songTitle || customer.projectName,
    referenceLink: customer.referenceLink,
    totalAmount: centsToDollars(orderSummary.totalCents),
    amountDueNow: "0.00",
    remainingBalance: "0.00",
    status: "paid",
    currency: "USD",
    orderSummary: noChargeSummary,
    rawPayload: {
      source: "friends_free_checkout",
      noChargeCheckout: true,
    },
  };
}

function normalizeCustomer(customer) {
  const name = normalizeRequiredText(customer.name, "Customer name");
  const email = normalizeEmail(customer.email);
  const projectName = normalizeRequiredText(
    customer.projectName,
    "Artist or project name"
  );
  const songTitle = normalizeRequiredText(
    customer.songTitle,
    "Song or project title"
  );
  const referenceLink =
    typeof customer.referenceLink === "string"
      ? customer.referenceLink.trim()
      : "";

  if (!email) throw new Error("A valid customer email is required.");

  return {
    name,
    email,
    projectName,
    songTitle,
    referenceLink,
  };
}

function normalizeRequiredText(value, label) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function normalizeEmail(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

module.exports = {
  INVALID_CODE_MESSAGE,
  buildNoChargeCheckoutPayment,
  normalizeFreeCheckoutCode,
  validateFreeCheckoutCode,
};
```

- [ ] **Step 4: Run the helper tests to verify they pass**

Run:

```bash
node --test test/free-code.test.js
```

Expected: PASS.

- [ ] **Step 5: Add the helper to syntax checks**

Modify the `check:js` script in `package.json` by inserting `node --check lib/checkout/free-code.js` immediately after `node --check lib/checkout/pricing.js`. Preserve the existing `check:links` and `scripts/check-local-references.js` entries already present in the working tree.

- [ ] **Step 6: Run syntax check for the new helper**

Run:

```bash
node --check lib/checkout/free-code.js
```

Expected: no output and exit code 0.

- [ ] **Step 7: Commit Task 1**

Run:

```bash
git add lib/checkout/free-code.js test/free-code.test.js package.json
git commit -m "Add direct checkout free code helper"
```

## Task 2: Add No-Charge Branch To Existing Checkout API

**Files:**
- Modify: `api/create-paypal-order.js`
- Modify: `test/paypal-api.test.js`

- [ ] **Step 1: Write failing API tests**

Add these imports near the existing imports in `test/paypal-api.test.js`:

```js
const { createPaypalOrderHandler } = createOrderRoute;
```

If that import already exists, keep the existing declaration and do not duplicate it.

Add these tests before `function createMockResponse()`:

```js
test("create order route starts no-charge checkout without calling PayPal", async () => {
  let workflowInput;
  const handler = createPaypalOrderHandler({
    getEnv: () => ({ FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026" }),
    fetch: async () => {
      throw new Error("PayPal fetch should not run for no-charge checkout");
    },
    paidProjectWorkflow: async (input) => {
      workflowInput = input;
      return {
        project: { id: "project-free-1", status: "awaiting_files" },
        order: { id: "order-free-1" },
        payment: { id: "payment-free-1" },
      };
    },
    idFactory: () => "free-route-123",
  });
  const response = createMockResponse();

  await handler(
    {
      method: "POST",
      body: {
        paymentMethod: "no_charge",
        discountCode: " friends2026 ",
        baseServiceId: "mix",
        songCount: 1,
        selectedAddOns: [],
        paymentMode: "full",
        customer: {
          name: "Buyer Friend",
          email: "friend@example.com",
          projectName: "Friend Project",
          songTitle: "Song One",
        },
      },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.noChargeCheckout, true);
  assert.equal(response.body.projectId, "project-free-1");
  assert.equal(response.body.orderSummary.noChargeCheckout, true);
  assert.equal(response.body.orderSummary.amountDueNowCents, 0);
  assert.equal(workflowInput.paypalTxnId, "NOCHARGE-free-route-123");
  assert.equal(workflowInput.amountDueNow, "0.00");
  assert.equal(workflowInput.remainingBalance, "0.00");
});

test("create order route rejects invalid no-charge code with generic message", async () => {
  const handler = createPaypalOrderHandler({
    getEnv: () => ({ FRIENDS_FREE_CHECKOUT_CODE: "FRIENDS2026" }),
    fetch: async () => {
      throw new Error("PayPal fetch should not run for invalid no-charge code");
    },
    paidProjectWorkflow: async () => {
      throw new Error("workflow should not run for invalid no-charge code");
    },
  });
  const response = createMockResponse();

  await handler(
    {
      method: "POST",
      body: {
        paymentMethod: "no_charge",
        discountCode: "wrong",
        baseServiceId: "mix",
        songCount: 1,
        selectedAddOns: [],
        paymentMode: "full",
        customer: {
          name: "Buyer Friend",
          email: "friend@example.com",
          projectName: "Friend Project",
          songTitle: "Song One",
        },
      },
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: "Discount code is not valid." });
});
```

Update the existing `checkout config exposes client id but never client secret` test by setting and restoring `FRIENDS_FREE_CHECKOUT_CODE`, then asserting it is absent:

```js
const originalFreeCode = process.env.FRIENDS_FREE_CHECKOUT_CODE;
process.env.FRIENDS_FREE_CHECKOUT_CODE = "FRIENDS2026";
assert.equal(JSON.stringify(response.body).includes("FRIENDS2026"), false);
```

Restore it in the `finally` block using the same pattern as the other environment variables.

- [ ] **Step 2: Run API tests to verify they fail**

Run:

```bash
node --test test/paypal-api.test.js
```

Expected: FAIL because the route does not recognize `paymentMethod: "no_charge"`.

- [ ] **Step 3: Implement the API branch**

Modify the top of `api/create-paypal-order.js`:

```js
const { buildNoChargeCheckoutPayment } = require("../lib/checkout/free-code");
const { createPaidProjectWorkflow } = require("../lib/automation/studio-workflow");
```

Inside `createPaypalOrderHandler`, add dependencies after `getEnv`:

```js
const paidProjectWorkflow =
  dependencies.paidProjectWorkflow || createPaidProjectWorkflow(dependencies);
const idFactory = dependencies.idFactory;
```

After `body = await readJsonBody(req);` and before calculating `orderSummary`, add:

```js
if (body && body.paymentMethod === "no_charge") {
  return handleNoChargeCheckout({
    body,
    res,
    env: getEnv(),
    paidProjectWorkflow,
    idFactory,
  });
}
```

Add this function below `createPaypalOrderHandler`:

```js
async function handleNoChargeCheckout({
  body,
  res,
  env,
  paidProjectWorkflow,
  idFactory,
}) {
  let paymentInput;
  try {
    paymentInput = buildNoChargeCheckoutPayment(body, { env, idFactory });
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message || "Discount code is not valid." });
  }

  try {
    const result = await paidProjectWorkflow(paymentInput);
    return res.status(200).json({
      ok: true,
      noChargeCheckout: true,
      projectId: result.project?.id || null,
      orderSummary: paymentInput.orderSummary,
    });
  } catch (error) {
    console.error("No-charge checkout failed:", sanitizeErrorForLog(error));
    return res.status(error.statusCode || 500).json({
      error: error.publicMessage || "Unable to start no-charge checkout.",
    });
  }
}
```

Add `handleNoChargeCheckout` to `module.exports._private`.

- [ ] **Step 4: Run API tests to verify they pass**

Run:

```bash
node --test test/paypal-api.test.js
```

Expected: PASS.

- [ ] **Step 5: Run focused helper and syntax checks**

Run:

```bash
node --test test/free-code.test.js test/paypal-api.test.js
node --check api/create-paypal-order.js
```

Expected: PASS for tests; no output from `node --check`.

- [ ] **Step 6: Commit Task 2**

Run:

```bash
git add api/create-paypal-order.js test/paypal-api.test.js
git commit -m "Route direct checkout free code through workflow"
```

## Task 3: Prove Workflow Accounting For No-Charge Paid Projects

**Files:**
- Modify: `test/studio-workflow.test.js`
- Modify only if needed: `lib/automation/project-payment-transition.js`

- [ ] **Step 1: Write the failing workflow test**

Add this test before `default email adapter logs failed email without aborting free review workflow` in `test/studio-workflow.test.js`:

```js
test("createPaidProjectWorkflow creates paid no-charge project with zero balance", async () => {
  const calls = [];
  const records = fakeRecords(calls);
  records.createProject = async (input) => {
    calls.push({ type: "project.create", input });
    return {
      id: "project-free-1",
      status: input.status,
      project_type: input.projectType,
      total_amount: input.totalAmount,
      amount_paid: input.amountPaid,
      balance_due: input.balanceDue,
      final_delivery_locked: input.finalDeliveryLocked,
      project_code: "DCR-000124",
    };
  };
  records.upsertPaymentAndOrder = async ({ payment }) => {
    calls.push({ type: "payment.upsert", payment });
    return {
      order: { id: "order-free-1" },
      payment: { id: "payment-free-1" },
    };
  };

  const workflow = createPaidProjectWorkflow({
    records,
    drive: fakeDrive(calls),
    email: fakeEmail(calls),
    env: { ADMIN_EMAIL: "josh@example.com" },
  });

  const result = await workflow({
    paymentPurpose: "checkout",
    paypalTxnId: "NOCHARGE-free-1",
    paypalOrderId: "NOCHARGE-free-1",
    buyerEmail: "friend@example.com",
    buyerName: "Buyer Friend",
    artistName: "Friend EP",
    projectTitle: "Song One",
    totalAmount: "433.20",
    amountDueNow: "0.00",
    remainingBalance: "0.00",
    status: "paid",
    orderSummary: {
      baseServiceId: "mixMaster",
      songCount: 2,
      paymentMode: "full",
      noChargeCheckout: true,
      amountDueNowCents: 0,
      remainingBalanceCents: 0,
      totalCents: 43320,
      originalTotalCents: 43320,
    },
  });

  assert.equal(result.project.project_type, "paid");
  assert.equal(result.project.status, "awaiting_files");
  assert.equal(result.project.total_amount, 433.2);
  assert.equal(result.project.amount_paid, 0);
  assert.equal(result.project.balance_due, 0);
  assert.equal(result.project.final_delivery_locked, false);
  assert.ok(calls.some((call) => call.type === "drive.create"));
  assert.ok(calls.some((call) => call.type === "email.customer"));
  assert.ok(calls.some((call) => call.type === "link.project"));
});
```

- [ ] **Step 2: Run workflow test**

Run:

```bash
node --test test/studio-workflow.test.js
```

Expected: PASS if existing transition code already honors `amountDueNow: "0.00"` and `remainingBalance: "0.00"`. If it fails because `amount_paid` becomes the full amount, continue to Step 3.

- [ ] **Step 3: Patch transition only if the test fails**

If Step 2 fails on amount paid, modify `buildCheckoutProjectTransition` in `lib/automation/project-payment-transition.js`:

```js
function buildCheckoutProjectTransition({ customerId, orderId, input }) {
  const totalAmount = normalizeMoney(input.totalAmount || 0);
  const amountPaid = normalizeMoney(
    input.amountDueNow !== undefined ? input.amountDueNow : input.totalAmount || 0
  );
  const balanceDue = normalizeMoney(
    input.remainingBalance !== undefined ? input.remainingBalance : 0
  );

  return {
    customerId,
    orderId,
    projectType: "paid",
    status: "awaiting_files",
    artistName: input.artistName,
    projectTitle: input.projectTitle,
    serviceId: input.orderSummary?.baseServiceId || null,
    songCount: Number(input.orderSummary?.songCount || 1),
    totalAmount,
    amountPaid,
    balanceDue,
    finalDeliveryLocked: shouldLockDelivery(balanceDue),
  };
}
```

- [ ] **Step 4: Re-run workflow tests**

Run:

```bash
node --test test/studio-workflow.test.js test/project-payment-transition.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add test/studio-workflow.test.js lib/automation/project-payment-transition.js
git commit -m "Cover no-charge paid project accounting"
```

If `lib/automation/project-payment-transition.js` was not modified, omit it from `git add`.

## Task 4: Add Checkout UI For Free Code

**Files:**
- Modify: `checkout.html`
- Modify: `checkout.js`
- Modify: `style.css`

- [ ] **Step 1: Add checkout markup**

In `checkout.html`, insert this block after `<div class="payment-mode" id="payment-mode"></div>`:

```html
<div class="discount-code-box">
  <label class="field-label" for="discount-code">Discount code</label>
  <div class="discount-code-row">
    <input
      id="discount-code"
      name="discountCode"
      type="text"
      autocomplete="off"
      spellcheck="false"
    />
    <button class="btn btn-secondary" id="apply-discount-code" type="button">
      Apply
    </button>
  </div>
  <p class="field-help" id="discount-code-status"></p>
</div>
<button
  class="btn btn-primary no-charge-checkout-button"
  id="no-charge-checkout"
  type="button"
  hidden
>
  Start Project
</button>
```

- [ ] **Step 2: Add checkout state and payload support**

In `checkout.js`, extend `checkoutState`:

```js
const checkoutState = {
  baseServiceId: 'mix',
  songCount: 1,
  selectedAddOns: [],
  paymentMode: 'full',
  discountCode: '',
  discountApplied: false,
};
```

Extend `getCheckoutPayload()`:

```js
function getCheckoutPayload() {
  const service = CHECKOUT_SERVICES[checkoutState.baseServiceId];
  return {
    baseServiceId: checkoutState.baseServiceId,
    songCount: service.depositOnly ? 1 : checkoutState.songCount,
    selectedAddOns: service.depositOnly ? [] : checkoutState.selectedAddOns,
    paymentMode: checkoutState.paymentMode,
    discountCode: checkoutState.discountCode,
    customer: getCustomerPayload(),
  };
}
```

- [ ] **Step 3: Render comp state in summary**

In `renderSummary()`, after add-on lines and before total lines, add:

```js
if (checkoutState.discountApplied) {
  lines.push(`<div class="summary-discount"><span>Friends comp</span><strong>-${formatMoney(estimate.totalCents)}</strong></div>`);
}
```

Replace the total/due-now lines with:

```js
const displayedDueNowCents = checkoutState.discountApplied
  ? 0
  : estimate.amountDueNowCents;
const displayedRemainingBalanceCents = checkoutState.discountApplied
  ? 0
  : estimate.remainingBalanceCents;

lines.push(`<div class="summary-total"><span>Total</span><strong>${formatMoney(estimate.totalCents)}</strong></div>`);
lines.push(`<div class="summary-total due-now"><span>Due now</span><strong>${formatMoney(displayedDueNowCents)}</strong></div>`);

if (displayedRemainingBalanceCents > 0) {
  lines.push(`<div><span>Remaining balance</span><strong>${formatMoney(displayedRemainingBalanceCents)}</strong></div>`);
}
```

At the end of `renderSummary()`, after the `payment-mode` HTML update, add:

```js
document.getElementById('no-charge-checkout').hidden = !checkoutState.discountApplied;
document.getElementById('paypal-button-container').hidden = checkoutState.discountApplied;
```

- [ ] **Step 4: Add no-charge submit behavior**

Add these functions before `wireEvents()`:

```js
function setDiscountStatus(message, isError = false) {
  const status = document.getElementById('discount-code-status');
  status.textContent = message;
  status.classList.toggle('is-error', Boolean(isError));
}

function applyDiscountCode() {
  const input = document.getElementById('discount-code');
  checkoutState.discountCode = input.value.trim();
  checkoutState.discountApplied = Boolean(checkoutState.discountCode);
  setDiscountStatus(
    checkoutState.discountApplied
      ? 'Code ready. Submit to validate and start the project.'
      : ''
  );
  renderSummary();
}

async function submitNoChargeCheckout() {
  try {
    assertFormReady();
    if (!checkoutState.discountCode) {
      setDiscountStatus('Enter a discount code first.', true);
      return;
    }

    const response = await fetch('/api/create-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...getCheckoutPayload(),
        paymentMethod: 'no_charge',
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      checkoutState.discountApplied = false;
      renderSummary();
      setDiscountStatus(data.error || 'Discount code is not valid.', true);
      return;
    }

    sessionStorage.setItem('dirtCatPaidOrder', JSON.stringify({
      status: 'NO_CHARGE_COMPLETED',
      noChargeCheckout: true,
      projectId: data.projectId,
      orderSummary: data.orderSummary,
      customer: getCustomerPayload(),
    }));
    window.location.href = 'success.html';
  } catch (error) {
    document.getElementById('checkout-error').textContent =
      error.message || 'Unable to start no-charge checkout.';
  }
}
```

In `wireEvents()`, add listeners:

```js
document.getElementById('apply-discount-code').addEventListener('click', applyDiscountCode);
document.getElementById('discount-code').addEventListener('input', (event) => {
  checkoutState.discountCode = event.target.value.trim();
  checkoutState.discountApplied = false;
  setDiscountStatus('');
  renderSummary();
});
document.getElementById('no-charge-checkout').addEventListener('click', submitNoChargeCheckout);
```

- [ ] **Step 5: Style discount controls**

Add near the checkout CSS in `style.css`:

```css
.discount-code-box {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}

.discount-code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: end;
}

.discount-code-row .btn {
  min-height: 44px;
}

#discount-code-status {
  min-height: 1.4rem;
}

#discount-code-status.is-error {
  color: #ffb4a8;
}

.no-charge-checkout-button {
  width: 100%;
  margin-top: 1rem;
}
```

- [ ] **Step 6: Run browser-script syntax check**

Run:

```bash
node --check checkout.js
```

Expected: no output and exit code 0.

- [ ] **Step 7: Commit Task 4**

Run:

```bash
git add checkout.html checkout.js style.css
git commit -m "Add direct checkout free code UI"
```

## Task 5: Add No-Charge Success State

**Files:**
- Modify: `success.html`
- Modify: `success.js`
- Modify: `test/success-page.test.js`

- [ ] **Step 1: Write success page test**

Add to `test/success-page.test.js`:

```js
test("success page exposes stable anchors for no-charge completion copy", () => {
  const html = readFileSync(join(root, "success.html"), "utf8");

  assert.match(html, /id="success-kicker"/);
  assert.match(html, /id="success-title"/);
  assert.match(html, /id="success-copy"/);
  assert.match(html, /id="success-step-payment"/);
  assert.match(html, /id="paid-summary"/);
});
```

- [ ] **Step 2: Run success page test to verify it fails**

Run:

```bash
node --test test/success-page.test.js
```

Expected: FAIL because the stable ids are not present.

- [ ] **Step 3: Add stable ids to success markup**

In `success.html`, update the hero and first next-step item:

```html
<p class="hero-kicker" id="success-kicker">PAYMENT RECEIVED</p>
<h1 id="success-title">Your Project Is Starting</h1>
<p id="success-copy">
  Watch your email for upload instructions and a project portal link.
  The portal is where project links, revisions, approvals, and delivery
  updates belong.
</p>
```

Change the first list item:

```html
<li id="success-step-payment">PayPal confirms the payment.</li>
```

- [ ] **Step 4: Update success rendering**

In `success.js`, update `renderPaidSummary()` after `const customer = data.customer || {};`:

```js
  if (summary.noChargeCheckout) {
    renderNoChargeCopy();
  }
```

Add this function before `renderPaidSummary()`:

```js
function renderNoChargeCopy() {
  const kicker = document.getElementById('success-kicker');
  const title = document.getElementById('success-title');
  const copy = document.getElementById('success-copy');
  const paymentStep = document.getElementById('success-step-payment');

  if (kicker) kicker.textContent = 'PROJECT STARTED';
  if (title) title.textContent = 'Your Project Is Starting';
  if (copy) {
    copy.textContent =
      'Your no-charge project is in the system. Watch your email for upload instructions and a project portal link.';
  }
  if (paymentStep) {
    paymentStep.textContent =
      'Dirt Cat Records records the no-charge checkout.';
  }
}
```

In `renderPaidSummary()`, replace the payment mode row:

```js
  appendSummaryRow(
    container,
    'Payment mode',
    summary.noChargeCheckout
      ? 'No-charge checkout'
      : summary.paymentMode === 'deposit'
        ? '50% deposit'
        : 'Full payment'
  );
```

Add original value after paid now:

```js
  if (summary.noChargeCheckout && Number(summary.originalTotalCents || 0) > 0) {
    appendSummaryRow(container, 'Original value', formatMoney(summary.originalTotalCents));
  }
```

- [ ] **Step 5: Run success tests and syntax check**

Run:

```bash
node --test test/success-page.test.js
node --check success.js
```

Expected: PASS for tests; no output from `node --check`.

- [ ] **Step 6: Commit Task 5**

Run:

```bash
git add success.html success.js test/success-page.test.js
git commit -m "Render no-charge checkout success state"
```

## Task 6: Final Verification

**Files:**
- Verify full working tree

- [ ] **Step 1: Run focused tests**

Run:

```bash
node --test test/free-code.test.js test/paypal-api.test.js test/studio-workflow.test.js test/project-payment-transition.test.js test/success-page.test.js
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run syntax checks**

Run:

```bash
npm run check:js
```

Expected: PASS.

- [ ] **Step 4: Run Vercel function count guardrail**

Run:

```bash
node scripts/check-vercel-function-limit.js
```

Expected: `Vercel function count OK: 12/12`.

- [ ] **Step 5: Run deploy preflight if local environment supports it**

Run:

```bash
npm run deploy:preflight
```

Expected: PASS. If this fails because local env credentials or unrelated pre-existing link-check work is missing, record the exact failing command and do not mask the failure.

- [ ] **Step 6: Inspect git state**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing files remain uncommitted. The currently known unrelated working-tree files are `scripts/check-local-references.js`, `test/check-local-references.test.js`, and the existing `package.json` link-check changes unless they have been committed separately by the time this plan is executed.

## Self-Review

- Spec coverage: Direct checkout only is covered by Tasks 1, 2, and 4. Quote and balance exclusions are covered by keeping `api/portal/actions.js` unchanged and by focused PayPal tests in Task 2. Server-side secrecy is covered by `FRIENDS_FREE_CHECKOUT_CODE` helper tests and checkout-config assertions. Workflow reuse and paid Project semantics are covered by Task 3. UI and success states are covered by Tasks 4 and 5. Function-count safety is covered by Task 6.
- Placeholder scan: This plan contains no deferred placeholders. Each code-writing step includes exact code or an exact replacement target.
- Type consistency: The plan uses `paymentMethod: "no_charge"` for the browser-to-server discriminator, `noChargeCheckout` for stored order-summary state, and `FRIENDS_FREE_CHECKOUT_CODE` for server configuration throughout.
