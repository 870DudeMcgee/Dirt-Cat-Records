const { requireUser } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');

function createApprovalsHandler(dependencies = {}) {
  const requireUserImpl = dependencies.requireUserImpl || requireUser;
  const records = dependencies.records || recordsDefault;

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
      return sendJson(res, 200, { ok: true, project: updatedProject });
    } catch (error) {
      return sendJson(res, 500, { error: 'Unable to approve final delivery.' });
    }
  };
}

const handler = createApprovalsHandler();
module.exports = handler;
module.exports.createApprovalsHandler = createApprovalsHandler;
