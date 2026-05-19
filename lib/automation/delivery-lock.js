function shouldLockDelivery(balanceDue) {
  return Number(balanceDue || 0) > 0;
}

function getPostPaymentStatus({ balanceDue, finalDeliveryUrl }) {
  if (shouldLockDelivery(balanceDue)) return "balance_due";
  return finalDeliveryUrl ? "delivered" : "paid";
}

module.exports = {
  getPostPaymentStatus,
  shouldLockDelivery,
};
