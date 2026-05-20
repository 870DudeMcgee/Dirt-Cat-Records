(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./action-policy"));
  } else {
    root.PortalActionRules = factory(root.PortalActionPolicy || {});
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (policy) {
  function hasBalanceDue(project = {}) {
    return Number(project.balance_due || 0) > 0;
  }

  function canPayBalance(project = {}) {
    return Boolean(
      policy.evaluatePortalAction?.("pay-balance", project).allowed
    );
  }

  function canApproveFinal(project = {}) {
    return Boolean(
      policy.evaluatePortalAction?.("approve-final", project).allowed
    );
  }

  function getAllowedPortalActions(project = {}) {
    if (typeof policy.getAllowedPortalActions === "function") {
      return policy.getAllowedPortalActions(project);
    }
    return [];
  }

  return {
    canApproveFinal,
    canPayBalance,
    getAllowedPortalActions,
    hasBalanceDue,
  };
});
