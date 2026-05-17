const { requireUser } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');
const { sendStudioEmail } = require('../../lib/email/resend');

function createRevisionsHandler(dependencies = {}) {
  const requireUserImpl = dependencies.requireUserImpl || requireUser;
  const records = dependencies.records || recordsDefault;
  const sendEmail = dependencies.sendEmail || sendStudioEmail;
  const env = dependencies.env || process.env;

  return async function revisionsHandler(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);
    let user;
    let body;
    try {
      user = await requireUserImpl(req);
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 400, { error: error.message || 'Invalid request' });
    }

    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (!projectId || !notes) return sendJson(res, 400, { error: 'Project id and revision notes are required.' });

    try {
      const customer = await records.getCustomerByEmail(user.email);
      if (!customer) return sendJson(res, 404, { error: 'Customer not found.' });
      const project = await records.getProjectForCustomer(projectId, customer.id);
      if (!project) return sendJson(res, 404, { error: 'Project not found.' });
      const allowed = Number(project.included_revisions || 0) + Number(project.extra_revisions_allowed || 0);
      const used = Number(project.used_revisions || 0);
      if (used >= allowed) return sendJson(res, 409, { error: 'No revision requests remain for this project.' });

      const revision = await records.createRevisionRequest({
        projectId: project.id,
        customerId: customer.id,
        notes,
        isExtraRevision: used >= Number(project.included_revisions || 0),
      });
      await records.updateProject(project.id, {
        status: 'revision_requested',
        used_revisions: used + 1,
      });
      await records.createProjectEvent({
        projectId: project.id,
        eventType: 'revision_requested',
        actorType: 'customer',
        message: 'Customer requested a revision.',
        metadata: { revisionId: revision.id },
      });
      await sendAndLogAdminNotification({
        records,
        sendEmail,
        env,
        project,
        customer,
        subject: 'Revision requested',
        text: `${customer.email} requested a revision for ${project.project_code || project.id}.`,
      });
      return sendJson(res, 200, { ok: true, revision });
    } catch (error) {
      return sendJson(res, 500, { error: 'Unable to request revision.' });
    }
  };
}

async function sendAndLogAdminNotification({ records, sendEmail, env, project, customer, subject, text }) {
  const recipient = env.ADMIN_EMAIL;
  if (!recipient) return;
  try {
    const result = await sendEmail({ to: recipient, emailType: 'admin_notification', data: { subject, text } }, { env });
    if (records.createEmailEvent) {
      await records.createEmailEvent({ projectId: project.id, customerId: customer.id, emailType: 'admin_notification', recipient, status: 'sent', resendMessageId: result.id || null });
    }
  } catch (error) {
    if (records.createEmailEvent) {
      await records.createEmailEvent({ projectId: project.id, customerId: customer.id, emailType: 'admin_notification', recipient, status: 'failed', errorMessage: error.message });
    }
  }
}

const handler = createRevisionsHandler();
module.exports = handler;
module.exports.createRevisionsHandler = createRevisionsHandler;
