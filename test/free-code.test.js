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
