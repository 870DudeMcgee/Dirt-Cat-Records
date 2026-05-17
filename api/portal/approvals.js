const { requireUser } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');
const { sendStudioEmail } = require('../../lib/email/resend');

function createApprovalsHandler(dependencies = {}) {
  const requireUserImpl = dependencies.requireUserImpl || requireUser;
  const records = dependencies.records || recordsDefault;
  const sendEmail = dependencies.sendEmail || sendStudioEmail;
  const env = dependencies.env || process.env;

  return async function approvalsHandler(req, res) {
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
    if (!projectId) return sendJson(res, 400, { error: 'Project id is required.' });

    try {
      const customer = await records.getCustomerByEmail(user.email);
      if (!customer) return sendJson(res, 404, { error: 'Customer not found.' });
      const project = await records.getProjectForCustomer(projectId, customer.id);
      if (!project) return sendJson(res, 404, { error: 'Project not found.' });
      const deliverableVisible = project.status === 'delivered' || (project.status === 'finals_ready' && project.final_delivery_locked === false);
      if (!deliverableVisible) return sendJson(res, 409, { error: 'Final delivery is not ready for approval.' });

      const updatedProject = await records.updateProject(project.id, { status: 'approved' });
      await records.createProjectEvent({
        projectId: project.id,
        eventType: 'final_approved',
        actorType: 'customer',
        message: 'Customer approved the final delivery.',
        metadata: {},
      });
      await sendAndLogAdminNotification({
        records,
        sendEmail,
        env,
        project,
        customer,
        subject: 'Final approved',
        text: `${customer.email} approved final delivery for ${project.project_code || project.id}.`,
      });
      return sendJson(res, 200, { ok: true, project: updatedProject });
    } catch (error) {
      return sendJson(res, 500, { error: 'Unable to approve final delivery.' });
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

const handler = createApprovalsHandler();
module.exports = handler;
module.exports.createApprovalsHandler = createApprovalsHandler;
