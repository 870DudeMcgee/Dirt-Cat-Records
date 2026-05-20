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
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

module.exports = {
  INVALID_CODE_MESSAGE,
  buildNoChargeCheckoutPayment,
  normalizeFreeCheckoutCode,
  validateFreeCheckoutCode,
};
