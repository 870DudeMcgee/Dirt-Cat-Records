const QUOTE_STATUSES = Object.freeze({
  DRAFT: "draft",
  SENT: "sent",
  VIEWED: "viewed",
  ACCEPTED: "accepted",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
});

const TERMINAL_QUOTE_STATUSES = new Set([
  QUOTE_STATUSES.ACCEPTED,
  QUOTE_STATUSES.EXPIRED,
  QUOTE_STATUSES.CANCELLED,
]);

function buildQuoteCreatedProjectPatch(quote) {
  return {
    active_quote_id: requireValue(quote.id, "quote id"),
    status: "quoted",
  };
}

function buildQuoteSentTransition({ quoteId, now = new Date().toISOString() }) {
  const id = requireValue(quoteId, "quote id");
  return {
    quotePatch: {
      status: QUOTE_STATUSES.SENT,
      sent_at: now,
    },
    projectPatch: {
      active_quote_id: id,
      status: "quote_sent",
    },
  };
}

function buildQuoteViewedPatch(quote, { now = new Date().toISOString() } = {}) {
  if (![QUOTE_STATUSES.SENT, QUOTE_STATUSES.DRAFT].includes(quote.status)) {
    return null;
  }

  return {
    status: QUOTE_STATUSES.VIEWED,
    viewed_at: now,
  };
}

function buildQuoteAcceptedPatch({ now = new Date().toISOString() } = {}) {
  return {
    status: QUOTE_STATUSES.ACCEPTED,
    accepted_at: now,
  };
}

function getQuoteCheckoutIntent(quote) {
  const status = String(quote.status || "").trim();
  if (TERMINAL_QUOTE_STATUSES.has(status)) {
    const error = new Error("Quote is not payable in its current status.");
    error.statusCode = 409;
    error.reason = "quote_not_payable";
    throw error;
  }

  const amountDueNowCents =
    quote.payment_mode === "deposit"
      ? Number(quote.deposit_cents || 0)
      : Number(quote.final_total_cents || 0);
  const totalCents = Number(quote.final_total_cents || amountDueNowCents);

  if (!Number.isInteger(amountDueNowCents) || amountDueNowCents < 1) {
    const error = new Error("Quote amount due now is invalid.");
    error.statusCode = 409;
    error.reason = "quote_amount_invalid";
    throw error;
  }

  if (!Number.isInteger(totalCents) || totalCents < amountDueNowCents) {
    const error = new Error("Quote total is invalid.");
    error.statusCode = 409;
    error.reason = "quote_total_invalid";
    throw error;
  }

  return {
    amountDueNowCents,
    totalCents,
  };
}

function requireValue(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

module.exports = {
  QUOTE_STATUSES,
  buildQuoteAcceptedPatch,
  buildQuoteCreatedProjectPatch,
  buildQuoteSentTransition,
  buildQuoteViewedPatch,
  getQuoteCheckoutIntent,
};
