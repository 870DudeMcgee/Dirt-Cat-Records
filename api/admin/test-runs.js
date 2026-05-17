const { requireAdmin } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');

function createTestRunsHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const records = dependencies.records || recordsDefault;
  const env = dependencies.env || process.env;

  return async function testRunsHandler(req, res) {
    if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res);
    try {
      await requireAdminImpl(req, { env });
      if (req.method === 'GET') {
        const testRunId = getQueryValue(req, 'testRunId');
        if (testRunId) {
          const run = await records.getAutomationTestRun(testRunId);
          if (!run) return sendJson(res, 404, { error: 'Test run not found.' });
          return sendJson(res, 200, { run });
        }
        const runs = typeof records.listAutomationTestRuns === 'function'
          ? await records.listAutomationTestRuns({ limit: '20' })
          : [];
        return sendJson(res, 200, { runs });
      }
      const body = await readJsonBody(req);
      const mode = body.mode === 'sandbox' ? 'sandbox' : 'simulation';
      const runAutomationTestImpl = dependencies.runAutomationTestImpl || getRunAutomationTest();
      const result = await runAutomationTestImpl({ mode, env });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode ? error.message : 'Unable to run automation test.',
      });
    }
  };
}

function getQueryValue(req, key) {
  if (req.query && req.query[key]) return Array.isArray(req.query[key]) ? req.query[key][0] : req.query[key];
  if (!req.url) return null;
  try {
    return new URL(req.url, 'http://localhost').searchParams.get(key);
  } catch (_error) {
    return null;
  }
}

function getRunAutomationTest() {
  return require('../../lib/automation/test-mode-runner').runAutomationTest;
}

const handler = createTestRunsHandler();

module.exports = handler;
module.exports.createTestRunsHandler = createTestRunsHandler;
