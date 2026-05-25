const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminOverviewHandler } = require('../lib/api/admin/overview');
const { buildAdminOverview, getAdminOverview } = require('../lib/db/studio-records');

test('buildAdminOverview summarizes actionable studio work', () => {
  const overview = buildAdminOverview({
    leads: [
      { id: 'lead-1', status: 'new', email: 'lead@example.com', artist_name: 'Lead Artist', project_title: 'Lead Song', created_at: '2026-05-18T10:00:00.000Z' },
      { id: 'lead-2', status: 'closed', email: 'closed@example.com', created_at: '2026-05-17T10:00:00.000Z' },
    ],
    projects: [
      { id: 'project-1', project_code: 'DCR-000001', status: 'awaiting_files', project_title: 'Needs Files', balance_due: '0.00', created_at: '2026-05-18T09:00:00.000Z' },
      { id: 'project-2', project_code: 'DCR-000002', status: 'files_submitted', project_title: 'Submitted', balance_due: '0.00', created_at: '2026-05-18T08:00:00.000Z' },
      { id: 'project-3', project_code: 'DCR-000003', status: 'mixing', project_title: 'In Mix', balance_due: '0.00', created_at: '2026-05-18T07:00:00.000Z' },
      { id: 'project-4', project_code: 'DCR-000004', status: 'revision_requested', project_title: 'Needs Revision', balance_due: '0.00', created_at: '2026-05-18T06:00:00.000Z' },
      { id: 'project-5', project_code: 'DCR-000005', status: 'finals_ready', project_title: 'Ready Locked', balance_due: '150.00', created_at: '2026-05-18T05:00:00.000Z' },
      { id: 'project-6', project_code: 'DCR-000006', status: 'balance_due', project_title: 'Balance Due', balance_due: '200.00', created_at: '2026-05-18T04:00:00.000Z' },
      { id: 'project-7', project_code: 'DCR-000007', status: 'approved', project_title: 'Approved', balance_due: '0.00', created_at: '2026-05-18T03:00:00.000Z' },
    ],
    revisions: [
      { id: 'revision-1', status: 'requested', notes: 'More vocal', created_at: '2026-05-18T02:00:00.000Z' },
      { id: 'revision-2', status: 'resolved', notes: 'Done', created_at: '2026-05-18T01:00:00.000Z' },
    ],
    events: [
      { id: 'event-1', event_type: 'files_submitted', message: 'Files submitted', created_at: '2026-05-18T11:00:00.000Z' },
    ],
  });

  assert.deepEqual(overview.metrics.map((metric) => [metric.key, metric.count]), [
    ['newLeads', 1],
    ['awaitingFiles', 1],
    ['filesSubmitted', 1],
    ['activeProjects', 3],
    ['revisionRequests', 1],
    ['finalsReady', 1],
    ['balancesDue', 2],
  ]);
  assert.equal(overview.queues.newLeads[0].email, 'lead@example.com');
  assert.equal(overview.queues.activeProjects.length, 3);
  assert.equal(overview.queues.balancesDue[0].balanceDueLabel, '$150.00');
  assert.equal(overview.recentEvents[0].message, 'Files submitted');
});

test('getAdminOverview fetches source records and returns a summary', async () => {
  const calls = [];
  const overview = await getAdminOverview({
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).includes('/leads')) return jsonResponse([{ id: 'lead-1', status: 'new', email: 'lead@example.com' }]);
      if (String(url).includes('/projects')) return jsonResponse([{ id: 'project-1', status: 'awaiting_files', project_code: 'DCR-000001' }]);
      if (String(url).includes('/revision_requests')) return jsonResponse([]);
      if (String(url).includes('/project_events')) return jsonResponse([]);
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(overview.metrics.find((metric) => metric.key === 'newLeads').count, 1);
  assert.equal(overview.metrics.find((metric) => metric.key === 'awaitingFiles').count, 1);
  assert.ok(calls.some((url) => url.includes('/leads?select=')));
  assert.ok(calls.some((url) => url.includes('/projects?select=')));
  assert.ok(calls.some((url) => url.includes('/revision_requests?select=')));
  assert.ok(calls.some((url) => url.includes('/project_events?select=')));
});

test('admin overview endpoint rejects non-admin users', async () => {
  const handler = createAdminOverviewHandler({
    requireAdminImpl: async () => {
      const error = new Error('Admin access required.');
      error.statusCode = 403;
      throw error;
    },
  });
  const res = response();

  await handler({ method: 'GET', headers: {} }, res);

  assert.equal(res.statusCode, 403);
});

test('admin overview endpoint returns overview data for admins', async () => {
  const handler = createAdminOverviewHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: {
      getAdminOverview: async () => ({
        metrics: [{ key: 'newLeads', label: 'New Leads', count: 2 }],
        queues: { newLeads: [], awaitingFiles: [], filesSubmitted: [], activeProjects: [], revisionRequests: [], finalsReady: [], balancesDue: [] },
        recentEvents: [],
      }),
    },
  });
  const res = response();

  await handler({ method: 'GET', headers: {}, url: '/api/admin/overview' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.overview.metrics[0].count, 2);
});

test('admin overview endpoint only accepts GET', async () => {
  const handler = createAdminOverviewHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: { getAdminOverview: async () => ({ metrics: [], queues: {}, recentEvents: [] }) },
  });
  const res = response();

  await handler({ method: 'POST', headers: {}, url: '/api/admin/overview' }, res);

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
