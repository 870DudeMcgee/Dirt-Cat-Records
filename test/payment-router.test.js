const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPaymentRouteContext,
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

test("routePaymentPurpose passes runtime context as a second handler argument", () => {
  const result = routePaymentPurpose(
    "balance",
    {
      balance: (purpose, context) => ({ purpose, context }),
    },
    {
      env: {
        VERCEL_ENV: "production",
        PAYPAL_ENV: "live",
      },
    }
  );

  assert.equal(result.purpose, "balance");
  assert.deepEqual(result.context, {
    purpose: "balance",
    runtimeEnvironment: "production",
    expectedPayPalEnv: "live",
    paypalEnv: "live",
  });
});

test("buildPaymentRouteContext defaults local runtime to sandbox checkout", () => {
  assert.deepEqual(buildPaymentRouteContext({ env: {} }), {
    purpose: "checkout",
    runtimeEnvironment: "development",
    expectedPayPalEnv: "sandbox",
    paypalEnv: "sandbox",
  });
});
