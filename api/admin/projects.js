const { ensureRuntimeEnv } = require('../../lib/env/runtime');
const { requireAdmin } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');

ensureRuntimeEnv();

function createAdminProjectsHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const records = dependencies.records || recordsDefault;
  const env = dependencies.env || process.env;

  return async function adminProjectsHandler(req, res) {
    try {
      await requireAdminImpl(req, { env });
      const action = getQueryValue(req, 'action') || 'detail';
      if (action !== 'detail') return sendJson(res, 404, { error: 'Admin project action not found.' });
      if (req.method !== 'GET') return methodNotAllowed(res);

      const projectId = getQueryValue(req, 'projectId');
      if (!projectId) return sendJson(res, 400, { error: 'projectId is required.' });

      const project = await records.getAdminProjectDetail(projectId, { env });
      if (!project) return sendJson(res, 404, { error: 'Project not found.' });
      return sendJson(res, 200, { project });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode ? error.message : 'Unable to load admin project.',
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

const handler = createAdminProjectsHandler();

module.exports = handler;
module.exports.createAdminProjectsHandler = createAdminProjectsHandler;
