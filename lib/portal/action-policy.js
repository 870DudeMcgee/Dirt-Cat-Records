(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PortalActionPolicy = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PORTAL_ACTIONS = Object.freeze({
    PAY_BALANCE: "pay-balance",
    APPROVE_FINAL: "approve-final",
  });

  function evaluatePortalAction(action, project = {}) {
    if (action === PORTAL_ACTIONS.PAY_BALANCE) {
      return evaluateBalancePayment(project);
    }
    if (action === PORTAL_ACTIONS.APPROVE_FINAL) {
      return evaluateFinalApproval(project);
    }
    return {
      action,
      visible: false,
      allowed: false,
      reason: "unknown_action",
      statusCode: 404,
      error: "Portal action not found.",
    };
  }

  function evaluateBalancePayment(project = {}) {
    const balanceDue = normalizeMoney(project.balance_due);
    const amountCents = Math.round(balanceDue * 100);
    const hasBalanceDue = balanceDue > 0;
    const statusAllowsPayment = ["balance_due", "finals_ready"].includes(
      project.status
    );
    const allowed = hasBalanceDue && statusAllowsPayment;

    return {
      action: PORTAL_ACTIONS.PAY_BALANCE,
      visible: allowed,
      allowed,
      reason: allowed ? "allowed" : "balance_not_due",
      statusCode: allowed ? 200 : 409,
      error: allowed ? null : "No balance payment is due for this project.",
      amountCents,
    };
  }

  function evaluateFinalApproval(project = {}) {
    const hasUnlockedFinal =
      Boolean(project.final_delivery_url) &&
      project.final_delivery_locked === false;
    const statusAllowsApproval = ["finals_ready", "delivered"].includes(
      project.status
    );
    const allowed = hasUnlockedFinal && statusAllowsApproval;

    return {
      action: PORTAL_ACTIONS.APPROVE_FINAL,
      visible: allowed,
      allowed,
      reason: allowed ? "allowed" : "final_delivery_not_ready",
      statusCode: allowed ? 200 : 409,
      error: allowed ? null : "Final delivery is not ready for approval.",
    };
  }

  function getPortalActionPolicy(project = {}) {
    return [
      evaluatePortalAction(PORTAL_ACTIONS.PAY_BALANCE, project),
      evaluatePortalAction(PORTAL_ACTIONS.APPROVE_FINAL, project),
    ];
  }

  function getAllowedPortalActions(project = {}) {
    return getPortalActionPolicy(project)
      .filter((decision) => decision.allowed)
      .map((decision) => decision.action);
  }

  function normalizeMoney(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return 0;
    return Math.max(0, amount);
  }

  return {
    PORTAL_ACTIONS,
    evaluatePortalAction,
    getAllowedPortalActions,
    getPortalActionPolicy,
  };
});
