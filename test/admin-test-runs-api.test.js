const test = require('node:test');
const assert = require('node:assert/strict');
const { createSetupWizardHandler } = require('../api/admin/setup-wizard');

test('test-runs endpoint starts simulation runs for admin', async () => {
  const handler = createSetupWizardHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    runAutomationTestImpl: async (input) => ({
      id: 'simulation-run',
      report: { mode: input.mode, status: 'passed' },
    }),
  });
  const res = response();

  await handler({
    method: 'POST',
    headers: {},
    url: '/api/admin/setup-wizard?action=test-runs',
    body: JSON.stringify({ mode: 'simulation' }),
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.report.status, 'passed');
});

test('cleanup endpoint cleans a stored test run for admin', async () => {
  const handler = createSetupWizardHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: {
      getAutomationTestRun: async () => ({
        report: { id: 'run-1', createdDriveFolders: [], createdRecords: [] },
      }),
    },
    cleanupAutomationTestRunImpl: async ({ report }) => ({ ...report, cleanupStatus: 'cleaned' }),
  });
  const res = response();

  await handler({
    method: 'POST',
    headers: {},
    url: '/api/admin/setup-wizard?action=cleanup',
    body: JSON.stringify({ testRunId: 'run-1' }),
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.report.cleanupStatus, 'cleaned');
});

test('test-runs endpoint lists stored runs for admin', async () => {
  const handler = createSetupWizardHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: {
      listAutomationTestRuns: async () => [{ id: 'run-1', report: { status: 'passed' } }],
    },
  });
  const res = response();

  await handler({ method: 'GET', headers: {}, url: '/api/admin/setup-wizard?action=test-runs' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.runs[0].id, 'run-1');
});

test('test-runs endpoint returns stored run detail for admin', async () => {
  const handler = createSetupWizardHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: {
      getAutomationTestRun: async (id) => ({ id, report: { status: 'passed' } }),
    },
  });
  const res = response();

  await handler({ method: 'GET', headers: {}, url: '/api/admin/setup-wizard?action=test-runs&testRunId=run-1' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.run.id, 'run-1');
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
