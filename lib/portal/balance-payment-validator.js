const { canPayBalance } = require("./action-rules");

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

  if (!canPayBalance(project)) {
    return {
      ok: false,
      statusCode: 409,
      reason: "balance_not_due",
      error: "No balance payment is due for this project.",
    };
  }

  const amountCents = Math.round(Number(project.balance_due || 0) * 100);
  return {
    ok: true,
    project,
    amountCents,
  };
}

module.exports = {
  validateBalancePaymentRequest,
};
