const { requireAdmin } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');

function createCleanupTestRunHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const records = dependencies.records || recordsDefault;
  const env = dependencies.env || process.env;

  return async function cleanupTestRunHandler(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      await requireAdminImpl(req, { env });
      const body = await readJsonBody(req);
      if (!body.testRunId) return sendJson(res, 400, { error: 'testRunId is required.' });
      const run = await records.getAutomationTestRun(body.testRunId);
      if (!run) return sendJson(res, 404, { error: 'Test run not found.' });
      const cleanupAutomationTestRunImpl = dependencies.cleanupAutomationTestRunImpl || getCleanupAutomationTestRun();
      const report = await cleanupAutomationTestRunImpl({ report: run.report, records });
      return sendJson(res, 200, { report });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode ? error.message : 'Unable to clean up test run.',
      });
    }
  };
}

function getCleanupAutomationTestRun() {
  return require('../../lib/automation/test-cleanup').cleanupAutomationTestRun;
}

const handler = createCleanupTestRunHandler();

module.exports = handler;
module.exports.createCleanupTestRunHandler = createCleanupTestRunHandler;
