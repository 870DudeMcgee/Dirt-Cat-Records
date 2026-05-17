const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestRunsHandler } = require('../api/admin/test-runs');
const { createCleanupTestRunHandler } = require('../api/admin/cleanup-test-run');

test('test-runs endpoint starts simulation runs for admin', async () => {
  const handler = createTestRunsHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    runAutomationTestImpl: async (input) => ({
      id: 'simulation-run',
      report: { mode: input.mode, status: 'passed' },
    }),
  });
  const res = response();

  await handler({ method: 'POST', headers: {}, body: JSON.stringify({ mode: 'simulation' }) }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.report.status, 'passed');
});

test('cleanup endpoint cleans a stored test run for admin', async () => {
  const handler = createCleanupTestRunHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: {
      getAutomationTestRun: async () => ({
        report: { id: 'run-1', createdDriveFolders: [], createdRecords: [] },
      }),
    },
    cleanupAutomationTestRunImpl: async ({ report }) => ({ ...report, cleanupStatus: 'cleaned' }),
  });
  const res = response();

  await handler({ method: 'POST', headers: {}, body: JSON.stringify({ testRunId: 'run-1' }) }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.report.cleanupStatus, 'cleaned');
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
