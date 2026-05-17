const { requireAdmin } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');

function createTestRunsHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const env = dependencies.env || process.env;

  return async function testRunsHandler(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);
    try {
      await requireAdminImpl(req, { env });
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

function getRunAutomationTest() {
  return require('../../lib/automation/test-mode-runner').runAutomationTest;
}

const handler = createTestRunsHandler();

module.exports = handler;
module.exports.createTestRunsHandler = createTestRunsHandler;
