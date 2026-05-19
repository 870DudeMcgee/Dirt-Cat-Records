const MS_PER_DAY = 24 * 60 * 60 * 1000;

function selectFollowUpForProject(project, options = {}) {
  if (!project || typeof project !== "object") return null;

  const now = parseDate(options.now) || new Date();
  const thresholds = {
    missingFilesDays: toNonNegativeNumber(options.missingFilesDays, 3),
    pendingQuoteDays: toNonNegativeNumber(options.pendingQuoteDays, 2),
    balanceDueDays: toNonNegativeNumber(options.balanceDueDays, 2),
    finalApprovalDays: toNonNegativeNumber(options.finalApprovalDays, 3),
  };

  const status = normalizeStatus(project.status);
  const staleDays = getStaleDays(project, now);
  if (staleDays === null) return null;

  if (status === "awaiting_files" && staleDays >= thresholds.missingFilesDays) {
    return buildSelection("missing_files", staleDays, project);
  }

  if (status === "quote_sent" && staleDays >= thresholds.pendingQuoteDays) {
    return buildSelection("pending_quote", staleDays, project);
  }

  if (
    (status === "balance_due" || status === "finals_ready") &&
    Number(project.balance_due || 0) > 0 &&
    staleDays >= thresholds.balanceDueDays
  ) {
    return buildSelection("balance_due", staleDays, project);
  }

  if (
    status === "delivered" &&
    project.final_delivery_locked === false &&
    staleDays >= thresholds.finalApprovalDays
  ) {
    return buildSelection("final_approval", staleDays, project);
  }

  return null;
}

function selectFollowUps(projects, options = {}) {
  if (!Array.isArray(projects) || projects.length === 0) return [];
  return projects
    .map((project) => selectFollowUpForProject(project, options))
    .filter(Boolean);
}

function buildSelection(type, staleDays, project) {
  return {
    projectId: project.id || null,
    projectCode: project.project_code || null,
    customerId: project.customer_id || null,
    reminderType: type,
    staleDays,
    status: normalizeStatus(project.status),
  };
}

function getStaleDays(project, now) {
  const updatedAt =
    parseDate(project.updated_at) || parseDate(project.created_at);
  if (!updatedAt) return null;
  return Math.max(
    0,
    Math.floor((now.getTime() - updatedAt.getTime()) / MS_PER_DAY)
  );
}

function parseDate(value) {
  if (!value) return null;
  const candidate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function normalizeStatus(status) {
  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

function toNonNegativeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

module.exports = {
  selectFollowUpForProject,
  selectFollowUps,
  _private: {
    getStaleDays,
    parseDate,
    normalizeStatus,
  },
};
