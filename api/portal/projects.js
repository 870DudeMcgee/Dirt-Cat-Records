const { requireUser } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, sendJson } = require('../../lib/http/json');
const { supabaseRequest, normalizeEmail } = require('../../lib/db/studio-records');

module.exports = async function portalProjectsHandler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  try {
    const user = await requireUser(req);
    const email = normalizeEmail(user.email);
    const customers = await supabaseRequest('/customers', {
      query: { email: `eq.${email}`, select: 'id,email' },
    });
    if (!customers[0]) return sendJson(res, 200, { projects: [] });
    const projects = await supabaseRequest('/projects', {
      query: {
        customer_id: `eq.${customers[0].id}`,
        select: 'id,project_code,project_type,status,artist_name,project_title,drive_upload_folder_url,final_delivery_url,balance_due,final_delivery_locked',
        order: 'created_at.desc',
      },
    });
    return sendJson(res, 200, { projects });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: error.statusCode ? error.message : 'Unable to load projects.',
    });
  }
};
