const { ensureRuntimeEnv } = require("../../lib/env/runtime");
const { requireAdmin } = require("../../lib/auth/supabase-auth");
const {
  methodNotAllowed,
  readJsonBody,
  sendJson,
} = require("../../lib/http/json");
const recordsDefault = require("../../lib/db/studio-records");

ensureRuntimeEnv();

function createSetupWizardHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const records = dependencies.records || recordsDefault;
  const env = dependencies.env || process.env;

  return async function setupWizardHandler(req, res) {
    try {
      await requireAdminImpl(req, { env });
      const action = getQueryValue(req, "action") || "setup";

      if (action === "setup")
        return handleSetup({ req, res, dependencies, env });
      if (action === "test-runs")
        return handleTestRuns({ req, res, dependencies, records, env });
      if (action === "cleanup")
        return handleCleanup({ req, res, dependencies, records });

      return sendJson(res, 404, { error: "Admin action not found." });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode
          ? error.message
          : "Unable to complete admin setup request.",
      });
    }
  };
}

async function handleSetup({ req, res, dependencies, env }) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const runSetupChecksImpl =
    dependencies.runSetupChecksImpl || getRunSetupChecks();
  const setup = await runSetupChecksImpl({ env });
  return sendJson(res, 200, { setup });
}

async function handleTestRuns({ req, res, dependencies, records, env }) {
  if (!["GET", "POST"].includes(req.method)) return methodNotAllowed(res);
  if (req.method === "GET") {
    const testRunId = getQueryValue(req, "testRunId");
    if (testRunId) {
      let run;
      try {
        run = await records.getAutomationTestRun(testRunId);
      } catch (error) {
        if (isMissingAutomationTestRunsError(error)) {
          return sendJson(res, 404, {
            error: "Test run storage is not set up yet.",
          });
        }
        throw error;
      }
      if (!run) return sendJson(res, 404, { error: "Test run not found." });
      return sendJson(res, 200, { run });
    }
    let runs = [];
    if (typeof records.listAutomationTestRuns === "function") {
      try {
        runs = await records.listAutomationTestRuns({ limit: "20" });
      } catch (error) {
        if (!isMissingAutomationTestRunsError(error)) throw error;
      }
    }
    return sendJson(res, 200, { runs });
  }

  const body = await readJsonBody(req);
  const mode = body.mode === "sandbox" ? "sandbox" : "simulation";
  const scenario =
    body.scenario === "v1-usability" ? "v1-usability" : "standard";
  const runAutomationTestImpl =
    dependencies.runAutomationTestImpl || getRunAutomationTest();
  const result = await runAutomationTestImpl({
    mode,
    scenario,
    testRunId: body.testRunId,
    env,
  });
  return sendJson(res, 200, result);
}

async function handleCleanup({ req, res, dependencies, records }) {
  if (req.method !== "POST") return methodNotAllowed(res);
  const body = await readJsonBody(req);
  if (!body.testRunId)
    return sendJson(res, 400, { error: "testRunId is required." });
  const run = await records.getAutomationTestRun(body.testRunId);
  if (!run) return sendJson(res, 404, { error: "Test run not found." });
  const cleanupAutomationTestRunImpl =
    dependencies.cleanupAutomationTestRunImpl || getCleanupAutomationTestRun();
  const report = await cleanupAutomationTestRunImpl({
    report: run.report,
    records,
  });
  return sendJson(res, 200, { report });
}

function getQueryValue(req, key) {
  if (req.query && req.query[key])
    return Array.isArray(req.query[key]) ? req.query[key][0] : req.query[key];
  if (!req.url) return null;
  try {
    return new URL(req.url, "http://localhost").searchParams.get(key);
  } catch (_error) {
    return null;
  }
}

function getRunSetupChecks() {
  return require("../../lib/automation/setup-checks").runSetupChecks;
}

function getRunAutomationTest() {
  return require("../../lib/automation/test-mode-runner").runAutomationTest;
}

function getCleanupAutomationTestRun() {
  return require("../../lib/automation/test-cleanup").cleanupAutomationTestRun;
}

function isMissingAutomationTestRunsError(error) {
  return /automation_test_runs/i.test(error?.message || "");
}

const handler = createSetupWizardHandler();

module.exports = handler;
module.exports.createSetupWizardHandler = createSetupWizardHandler;
