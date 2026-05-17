const { requireAdmin } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, sendJson } = require('../../lib/http/json');

function createSetupHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const env = dependencies.env || process.env;

  return async function setupHandler(req, res) {
    if (req.method !== 'GET') return methodNotAllowed(res);
    try {
      await requireAdminImpl(req, { env });
      const runSetupChecksImpl = dependencies.runSetupChecksImpl || getRunSetupChecks();
      const setup = await runSetupChecksImpl({ env });
      return sendJson(res, 200, { setup });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode ? error.message : 'Unable to load setup status.',
      });
    }
  };
}

function getRunSetupChecks() {
  return require('../../lib/automation/setup-checks').runSetupChecks;
}

const handler = createSetupHandler();

module.exports = handler;
module.exports.createSetupHandler = createSetupHandler;
