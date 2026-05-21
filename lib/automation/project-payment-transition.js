const { buildQuoteAcceptedPatch } = require("./quote-lifecycle");

const UNLIMITED_INCLUDED_REVISIONS = 1000000;

function buildCheckoutProjectTransition({ customerId, orderId, input }) {
  const totalAmount = normalizeMoney(input.totalAmount || 0);
  const amountPaid = normalizeMoney(
    input.amountDueNow || input.totalAmount || 0
  );
  const balanceDue = normalizeMoney(input.remainingBalance || 0);

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
    includedRevisions: getIncludedRevisions(input),
    finalDeliveryLocked: shouldLockDelivery(balanceDue),
  };
}

function getIncludedRevisions(input) {
  if (
    input.orderSummary?.unlimitedRevisions === true ||
    input.orderSummary?.noChargeCheckout === true
  ) {
    return UNLIMITED_INCLUDED_REVISIONS;
  }
  return 1;
}

function buildQuotePaymentTransition({ project, quote, input }) {
  const amountPaid = normalizeMoney(
    input.amountDueNow || input.totalAmount || 0
  );
  const totalAmount = normalizeMoney(
    input.totalAmount || centsToMoney(quote.final_total_cents || 0)
  );
  const balanceDue = normalizeMoney(
    input.remainingBalance !== undefined
      ? input.remainingBalance || 0
      : centsToMoney(quote.balance_cents || 0)
  );

  return {
    projectPatch: {
      project_type: "paid",
      status: getPostPaymentStatus({ balanceDue }),
      service_id: quote.base_service_id || project.service_id || null,
      song_count: Number(quote.song_count || project.song_count || 1),
      total_amount: formatMoney(totalAmount),
      amount_paid: formatMoney(amountPaid),
      balance_due: formatMoney(balanceDue),
      final_delivery_locked: shouldLockDelivery(balanceDue),
      active_quote_id: quote.id,
    },
    quotePatch: buildQuoteAcceptedPatch(),
  };
}

function buildBalancePaymentTransition({ project, input }) {
  const paymentAmount = normalizeMoney(
    input.amountDueNow || input.totalAmount || 0
  );
  const currentAmountPaid = normalizeMoney(project.amount_paid || 0);
  const currentBalanceDue = normalizeMoney(project.balance_due || 0);
  const totalAmount = normalizeMoney(
    project.total_amount ||
      currentAmountPaid + currentBalanceDue ||
      paymentAmount
  );
  const amountPaid = normalizeMoney(currentAmountPaid + paymentAmount);
  const balanceDue = normalizeMoney(currentBalanceDue - paymentAmount);

  return {
    paymentAmount,
    projectPatch: {
      amount_paid: formatMoney(amountPaid),
      total_amount: formatMoney(totalAmount),
      balance_due: formatMoney(balanceDue),
      final_delivery_locked: shouldLockDelivery(balanceDue),
      status: getPostPaymentStatus({
        balanceDue,
        finalDeliveryUrl: project.final_delivery_url,
      }),
    },
  };
}

function shouldLockDelivery(balanceDue) {
  return normalizeMoney(balanceDue) > 0;
}

function getPostPaymentStatus({ balanceDue, finalDeliveryUrl }) {
  if (shouldLockDelivery(balanceDue)) return "balance_due";
  return finalDeliveryUrl ? "delivered" : "paid";
}

function centsToMoney(cents) {
  return Number(cents || 0) / 100;
}

function normalizeMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, amount);
}

function formatMoney(value) {
  return normalizeMoney(value).toFixed(2);
}

module.exports = {
  UNLIMITED_INCLUDED_REVISIONS,
  buildBalancePaymentTransition,
  buildCheckoutProjectTransition,
  buildQuotePaymentTransition,
  getPostPaymentStatus,
  shouldLockDelivery,
};
