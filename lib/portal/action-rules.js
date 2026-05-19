(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PortalActionRules = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function hasBalanceDue(project = {}) {
    return Number(project.balance_due || 0) > 0;
  }

  function canPayBalance(project = {}) {
    if (!hasBalanceDue(project)) return false;
    return ["balance_due", "finals_ready"].includes(project.status);
  }

  function canApproveFinal(project = {}) {
    const hasUnlockedFinal =
      Boolean(project.final_delivery_url) &&
      project.final_delivery_locked === false;
    return (
      hasUnlockedFinal && ["finals_ready", "delivered"].includes(project.status)
    );
  }

  function getAllowedPortalActions(project = {}) {
    const actions = [];
    if (canPayBalance(project)) actions.push("pay-balance");
    if (canApproveFinal(project)) actions.push("approve-final");
    return actions;
  }

  return {
    canApproveFinal,
    canPayBalance,
    getAllowedPortalActions,
    hasBalanceDue,
  };
});
