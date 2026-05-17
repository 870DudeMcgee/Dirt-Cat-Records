const { requireUser } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');
const { sendStudioEmail } = require('../../lib/email/resend');

function createFileLinksHandler(dependencies = {}) {
  const requireUserImpl = dependencies.requireUserImpl || requireUser;
  const records = dependencies.records || recordsDefault;
  const sendEmail = dependencies.sendEmail || sendStudioEmail;

  return async function fileLinksHandler(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);
    let user;
    let body;
    try {
      user = await requireUserImpl(req);
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 400, { error: error.message || 'Invalid request' });
    }

    const url = normalizeHttpUrl(body.url);
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
    if (!projectId || !url) return sendJson(res, 400, { error: 'Project id and valid link are required.' });

    try {
      const { customer, project } = await getOwnedProject({ records, user, projectId });
      const file = await records.createProjectFile({
        projectId: project.id,
        orderId: project.order_id,
        uploadLink: url,
        status: 'submitted',
      });
      await records.updateProject(project.id, { status: 'files_submitted' });
      await records.createProjectEvent({
        projectId: project.id,
        eventType: 'files_submitted',
        actorType: 'customer',
        message: 'Customer submitted an external file link.',
        metadata: { fileId: file.id, url },
      });
      await sendAndLog({ records, sendEmail, customer, emailType: 'files_received', data: {} });
      return sendJson(res, 200, { ok: true, file });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Unable to submit file link.' });
    }
  };
}

async function getOwnedProject({ records, user, projectId }) {
  const customer = await records.getCustomerByEmail(user.email);
  if (!customer) throw createStatusError(404, 'Customer not found.');
  const project = await records.getProjectForCustomer(projectId, customer.id);
  if (!project) throw createStatusError(404, 'Project not found.');
  return { customer, project };
}

async function sendAndLog({ records, sendEmail, customer, emailType, data }) {
  try {
    const result = await sendEmail({ to: customer.email, emailType, data });
    if (records.createEmailEvent) {
      await records.createEmailEvent({ customerId: customer.id, emailType, recipient: customer.email, status: 'sent', resendMessageId: result.id || null });
    }
  } catch (error) {
    if (records.createEmailEvent) {
      await records.createEmailEvent({ customerId: customer.id, emailType, recipient: customer.email, status: 'failed', errorMessage: error.message });
    }
  }
}

function normalizeHttpUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch (_error) {
    return null;
  }
}

function createStatusError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const handler = createFileLinksHandler();
module.exports = handler;
module.exports.createFileLinksHandler = createFileLinksHandler;
