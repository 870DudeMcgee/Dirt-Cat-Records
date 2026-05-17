const test = require('node:test');
const assert = require('node:assert/strict');
const { createSetupHandler } = require('../api/admin/setup');

test('setup endpoint rejects non-admin users', async () => {
  const handler = createSetupHandler({
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

test('setup endpoint returns readiness report for admin', async () => {
  const handler = createSetupHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    runSetupChecksImpl: async () => ({ overallStatus: 'passed', sections: {} }),
    env: { ADMIN_EMAIL: 'josh@example.com' },
  });
  const res = response();

  await handler({ method: 'GET', headers: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.setup.overallStatus, 'passed');
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
