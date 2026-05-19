const { ensureRuntimeEnv } = require('../../lib/env/runtime');
const { requireAdmin } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');

ensureRuntimeEnv();

function createAdminOverviewHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const records = dependencies.records || recordsDefault;
  const env = dependencies.env || process.env;

  return async function adminOverviewHandler(req, res) {
    try {
      await requireAdminImpl(req, { env });
      if (req.method !== 'GET') return methodNotAllowed(res);
      const overview = await records.getAdminOverview({ env });
      return sendJson(res, 200, { overview });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode ? error.message : 'Unable to load admin overview.',
      });
    }
  };
}

const handler = createAdminOverviewHandler();

module.exports = handler;
module.exports.createAdminOverviewHandler = createAdminOverviewHandler;
