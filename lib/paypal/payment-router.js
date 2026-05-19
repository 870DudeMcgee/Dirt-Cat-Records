function normalizePaymentPurpose(value) {
  if (value === "quote") return "quote";
  if (value === "balance") return "balance";
  return "checkout";
}

function routePaymentPurpose(paymentPurpose, handlers = {}) {
  const purpose = normalizePaymentPurpose(paymentPurpose);
  const handler = handlers[purpose] || handlers.checkout || handlers.default;
  if (typeof handler !== "function") {
    throw new Error(`No payment-purpose handler configured for ${purpose}.`);
  }
  return handler(purpose);
}

module.exports = {
  normalizePaymentPurpose,
  routePaymentPurpose,
};
