const { randomBytes } = require("node:crypto");

const TEST_RUN_ID_PREFIXES = {
  sandbox: "dcrtest-sbx",
};

function createTestRunId(mode, now = new Date()) {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "");
  const prefix = TEST_RUN_ID_PREFIXES[mode] || mode;
  return `${prefix}-${stamp}-${randomBytes(3).toString("hex")}`;
}

function createTestReport({
  id,
  mode,
  businessName,
  scenario = "standard",
  config,
}) {
  const startedAt = new Date().toISOString();
  return {
    id,
    mode,
    scenario,
    status: "running",
    businessName,
    startedAt,
    finishedAt: null,
    config,
    steps: [],
    createdRecords: [],
    createdDriveFolders: [],
    sentEmails: [],
    paypalEvents: [],
    warnings: [],
    errors: [],
    cleanupStatus: "not_requested",
  };
}

function addStep(report, step) {
  const next = cloneReport(report);
  next.steps.push({
    key: step.key,
    label: step.label,
    status: step.status,
    detail: step.detail || null,
    error: step.error || null,
  });
  if (step.status === "failed" && step.error) next.errors.push(step.error);
  if (step.warning) next.warnings.push(step.warning);
  return next;
}

function addArtifact(report, artifact) {
  const next = cloneReport(report);
  if (artifact.type === "drive") next.createdDriveFolders.push(artifact);
  else if (artifact.type === "email") next.sentEmails.push(artifact);
  else if (artifact.type === "paypal") next.paypalEvents.push(artifact);
  else next.createdRecords.push(artifact);
  return next;
}

function finishReport(report) {
  const next = cloneReport(report);
  next.finishedAt = new Date().toISOString();
  next.status = next.steps.some((step) => step.status === "failed")
    ? "failed"
    : "passed";
  return next;
}

function markCleanup(report, cleanupStatus) {
  const next = cloneReport(report);
  next.cleanupStatus = cleanupStatus;
  if (cleanupStatus === "cleaned") next.status = "cleaned";
  return next;
}

function cloneReport(report) {
  return JSON.parse(JSON.stringify(report));
}

module.exports = {
  addArtifact,
  addStep,
  createTestReport,
  createTestRunId,
  finishReport,
  markCleanup,
};
