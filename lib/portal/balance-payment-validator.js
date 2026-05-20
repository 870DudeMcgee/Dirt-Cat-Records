const { evaluatePortalAction } = require("./action-policy");

async function validateBalancePaymentRequest({
  projectId,
  customerId,
  records,
}) {
  const normalizedProjectId =
    typeof projectId === "string" ? projectId.trim() : "";
  if (!normalizedProjectId) {
    return {
      ok: false,
      statusCode: 400,
      reason: "project_id_required",
      error: "projectId is required.",
    };
  }

  const project = await records.getProjectForCustomer(
    normalizedProjectId,
    customerId
  );
  if (!project) {
    return {
      ok: false,
      statusCode: 404,
      reason: "project_not_found",
      error: "Project not found.",
    };
  }

  const decision = evaluatePortalAction("pay-balance", project);
  if (!decision.allowed) {
    return {
      ok: false,
      statusCode: decision.statusCode,
      reason: decision.reason,
      error: decision.error,
    };
  }

  return {
    ok: true,
    project,
    amountCents: decision.amountCents,
  };
}

module.exports = {
  validateBalancePaymentRequest,
};
