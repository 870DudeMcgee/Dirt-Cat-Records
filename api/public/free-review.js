const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const { normalizeEmail } = require('../../lib/db/studio-records');
const { createFreeReviewWorkflow } = require('../../lib/automation/studio-workflow');

function createFreeReviewHandler(dependencies = {}) {
  const runWorkflow = dependencies.runWorkflow || createFreeReviewWorkflow();

  return async function freeReviewHandler(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 400, { error: error.publicMessage || 'Invalid request' });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendJson(res, 400, { error: 'Invalid request payload.' });
    }
    const email = normalizeEmail(body.email);
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!email) return sendJson(res, 400, { error: 'A valid email is required.' });
    if (!message) {
      return sendJson(res, 400, { error: 'A short message is required.' });
    }

    try {
      const result = await runWorkflow({
        email,
        name: body.name || '',
        artistName: body.artistName || '',
        projectTitle: body.projectTitle || '',
        message,
        referenceLinks: Array.isArray(body.referenceLinks) ? body.referenceLinks : [],
      });
      return sendJson(res, 200, { ok: true, projectId: result.project.id });
    } catch (error) {
      console.error('Free review submission failed:', { message: error.message });
      return sendJson(res, 500, { error: 'Free review submission failed.' });
    }
  };
}

const handler = createFreeReviewHandler();
module.exports = handler;
module.exports.createFreeReviewHandler = createFreeReviewHandler;
