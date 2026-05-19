const { ensureRuntimeEnv } = require('../../lib/env/runtime');
const { requireAdmin } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');

ensureRuntimeEnv();

function createAdminQuotesHandler(dependencies = {}) {
  const requireAdminImpl = dependencies.requireAdminImpl || requireAdmin;
  const records = dependencies.records || recordsDefault;
  const env = dependencies.env || process.env;

  return async function adminQuotesHandler(req, res) {
    try {
      const adminUser = await requireAdminImpl(req, { env });
      const action = getQueryValue(req, 'action') || 'create';

      if (action === 'create') {
        if (req.method !== 'POST') return methodNotAllowed(res);

        const body = await readJsonBody(req);
        if (!body.projectId) return sendJson(res, 400, { error: 'projectId is required.' });

        const quote = await records.createAdminQuote(body.projectId, {
          baseServiceId: body.baseServiceId,
          songCount: body.songCount,
          paymentMode: body.paymentMode,
          catalogTotalCents: body.catalogTotalCents,
          adjustmentCents: body.adjustmentCents,
          depositCents: body.depositCents,
          notes: body.notes,
          expiresAt: body.expiresAt,
          lineItems: body.lineItems,
        }, {
          env,
          adminEmail: adminUser?.email || '',
        });
        if (!quote) return sendJson(res, 404, { error: 'Project not found.' });
        return sendJson(res, 200, { quote });
      }

      if (action === 'send') {
        if (req.method !== 'POST') return methodNotAllowed(res);

        const body = await readJsonBody(req);
        if (!body.projectId) return sendJson(res, 400, { error: 'projectId is required.' });
        if (!body.quoteId) return sendJson(res, 400, { error: 'quoteId is required.' });

        const quote = await records.sendAdminQuote(body.projectId, body.quoteId, {
          env,
          adminEmail: adminUser?.email || '',
        });
        if (!quote) return sendJson(res, 404, { error: 'Quote not found.' });
        return sendJson(res, 200, { quote });
      }

      return sendJson(res, 404, { error: 'Admin quote action not found.' });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode ? error.message : 'Unable to process admin quote.',
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

const handler = createAdminQuotesHandler();

module.exports = handler;
module.exports.createAdminQuotesHandler = createAdminQuotesHandler;
