const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminProjectsHandler } = require('../api/admin/projects');
const { buildAdminProjectDetail, getAdminProjectDetail } = require('../lib/db/studio-records');

test('buildAdminProjectDetail normalizes project detail records', () => {
  const detail = buildAdminProjectDetail({
    project: {
      id: 'project-1',
      project_code: 'DCR-000123',
      project_type: 'paid',
      status: 'files_submitted',
      artist_name: 'The Client',
      project_title: 'Single Mix',
      service_id: 'mix',
      song_count: 1,
      included_revisions: 1,
      used_revisions: 0,
      extra_revisions_allowed: 1,
      total_amount: '800.00',
      amount_paid: '400.00',
      balance_due: '400.00',
      final_delivery_locked: true,
      drive_project_folder_url: 'https://drive.test/project',
      drive_upload_folder_url: 'https://drive.test/upload',
      drive_finals_folder_url: 'https://drive.test/finals',
      final_delivery_url: '',
      created_at: '2026-05-18T10:00:00.000Z',
      updated_at: '2026-05-18T12:00:00.000Z',
      customers: { id: 'customer-1', email: 'client@example.com', name: 'Client Name' },
    },
    files: [
      { id: 'file-1', upload_link: 'https://dropbox.test/files', version: 1, status: 'submitted', created_at: '2026-05-18T11:00:00.000Z' },
    ],
    revisions: [
      { id: 'revision-1', status: 'requested', notes: 'More vocal', is_extra_revision: false, created_at: '2026-05-18T13:00:00.000Z' },
    ],
    payments: [
      { id: 'payment-1', payment_purpose: 'checkout', status: 'paid', amount: '400.00', currency: 'USD', created_at: '2026-05-18T09:00:00.000Z' },
    ],
    events: [
      { id: 'event-1', event_type: 'files_submitted', actor_type: 'customer', message: 'Files received.', created_at: '2026-05-18T11:00:00.000Z' },
    ],
    emailEvents: [
      { id: 'email-1', email_type: 'upload_instructions', recipient: 'client@example.com', status: 'sent', created_at: '2026-05-18T09:30:00.000Z' },
    ],
  });

  assert.equal(detail.project.projectCode, 'DCR-000123');
  assert.equal(detail.customer.email, 'client@example.com');
  assert.equal(detail.financial.balanceDueLabel, '$400.00');
  assert.equal(detail.revisions.remaining, 2);
  assert.equal(detail.driveLinks.upload, 'https://drive.test/upload');
  assert.equal(detail.files[0].uploadLink, 'https://dropbox.test/files');
  assert.equal(detail.payments[0].amountLabel, '$400.00');
  assert.equal(detail.timeline[0].message, 'Files received.');
  assert.equal(detail.emailEvents[0].emailType, 'upload_instructions');
});

test('getAdminProjectDetail fetches project and related records', async () => {
  const calls = [];
  const detail = await getAdminProjectDetail('project-1', {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).includes('/projects')) return jsonResponse([{
        id: 'project-1',
        project_code: 'DCR-000123',
        status: 'files_submitted',
        balance_due: '0.00',
        customers: { id: 'customer-1', email: 'client@example.com' },
      }]);
      if (String(url).includes('/project_files')) return jsonResponse([{ id: 'file-1', upload_link: 'https://files.test', status: 'submitted' }]);
      if (String(url).includes('/revision_requests')) return jsonResponse([]);
      if (String(url).includes('/payments')) return jsonResponse([]);
      if (String(url).includes('/project_events')) return jsonResponse([{ id: 'event-1', message: 'Project created.' }]);
      if (String(url).includes('/email_events')) return jsonResponse([]);
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(detail.project.id, 'project-1');
  assert.equal(detail.files[0].uploadLink, 'https://files.test');
  assert.ok(calls.some((url) => url.includes('/projects?id=eq.project-1')));
  assert.ok(calls.some((url) => url.includes('/project_files?project_id=eq.project-1')));
  assert.ok(calls.some((url) => url.includes('/email_events?project_id=eq.project-1')));
});

test('getAdminProjectDetail returns null for missing projects', async () => {
  const detail = await getAdminProjectDetail('missing-project', {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async () => jsonResponse([]),
  });

  assert.equal(detail, null);
});

test('admin project detail endpoint rejects non-admin users', async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => {
      const error = new Error('Admin access required.');
      error.statusCode = 403;
      throw error;
    },
  });
  const res = response();

  await handler({ method: 'GET', headers: {}, url: '/api/admin/projects?action=detail&projectId=project-1' }, res);

  assert.equal(res.statusCode, 403);
});

test('admin project detail endpoint validates project id', async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
  });
  const res = response();

  await handler({ method: 'GET', headers: {}, url: '/api/admin/projects?action=detail' }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'projectId is required.');
});

test('admin project detail endpoint returns 404 for missing projects', async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: { getAdminProjectDetail: async () => null },
  });
  const res = response();

  await handler({ method: 'GET', headers: {}, url: '/api/admin/projects?action=detail&projectId=missing-project' }, res);

  assert.equal(res.statusCode, 404);
});

test('admin project detail endpoint returns detail data for admins', async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: {
      getAdminProjectDetail: async (projectId) => ({
        project: { id: projectId, projectCode: 'DCR-000123' },
        customer: { email: 'client@example.com' },
        files: [],
        revisions: { items: [] },
        payments: [],
        timeline: [],
        emailEvents: [],
      }),
    },
  });
  const res = response();

  await handler({ method: 'GET', headers: {}, url: '/api/admin/projects?action=detail&projectId=project-1' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.project.project.projectCode, 'DCR-000123');
});

test('admin project detail endpoint only accepts GET', async () => {
  const handler = createAdminProjectsHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
  });
  const res = response();

  await handler({ method: 'POST', headers: {}, url: '/api/admin/projects?action=detail&projectId=project-1' }, res);

  assert.equal(res.statusCode, 405);
});

function response() {
  return {
    statusCode: 0,
    body: undefined,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(body); },
  };
}
