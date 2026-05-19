const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizePaymentPurpose,
  routePaymentPurpose,
} = require("../lib/paypal/payment-router");

test("normalizePaymentPurpose maps unknown values to checkout", () => {
  assert.equal(normalizePaymentPurpose("quote"), "quote");
  assert.equal(normalizePaymentPurpose("balance"), "balance");
  assert.equal(normalizePaymentPurpose("unknown"), "checkout");
  assert.equal(normalizePaymentPurpose(undefined), "checkout");
});

test("routePaymentPurpose dispatches by normalized purpose", async () => {
  const calls = [];

  const resultQuote = await routePaymentPurpose("quote", {
    quote: async () => {
      calls.push("quote");
      return "Q";
    },
    checkout: async () => "C",
  });

  const resultCheckout = await routePaymentPurpose("not-a-purpose", {
    quote: async () => "Q",
    checkout: async () => {
      calls.push("checkout");
      return "C";
    },
  });

  assert.equal(resultQuote, "Q");
  assert.equal(resultCheckout, "C");
  assert.deepEqual(calls, ["quote", "checkout"]);
});
