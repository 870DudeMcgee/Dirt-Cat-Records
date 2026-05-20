const {
  getExpectedPayPalEnvironment,
  getRuntimeEnvironment,
} = require("../env/runtime-environment");

function normalizePaymentPurpose(value) {
  if (value === "quote") return "quote";
  if (value === "balance") return "balance";
  return "checkout";
}

function routePaymentPurpose(paymentPurpose, handlers = {}, context = {}) {
  const purpose = normalizePaymentPurpose(paymentPurpose);
  const handler = handlers[purpose] || handlers.checkout || handlers.default;
  if (typeof handler !== "function") {
    throw new Error(`No payment-purpose handler configured for ${purpose}.`);
  }
  return handler(purpose, buildPaymentRouteContext({ ...context, purpose }));
}

function buildPaymentRouteContext({ env = process.env, purpose } = {}) {
  const runtimeEnvironment = getRuntimeEnvironment(env);

  return {
    purpose: normalizePaymentPurpose(purpose),
    runtimeEnvironment: runtimeEnvironment.name,
    expectedPayPalEnv: getExpectedPayPalEnvironment(env),
    paypalEnv: normalizePayPalEnvironment(env.PAYPAL_ENV),
  };
}

function normalizePayPalEnvironment(value) {
  return String(value || "")
    .trim()
    .toLowerCase() === "live"
    ? "live"
    : "sandbox";
}

module.exports = {
  buildPaymentRouteContext,
  normalizePaymentPurpose,
  routePaymentPurpose,
};
