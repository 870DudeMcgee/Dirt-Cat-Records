const test = require('node:test');
const assert = require('node:assert/strict');
const { createFileLinksHandler } = require('../api/portal/file-links');

test('portal file link endpoint rejects unauthenticated requests', async () => {
  const handler = createFileLinksHandler({
    requireUserImpl: async () => {
      const error = new Error('Authentication required.');
      error.statusCode = 401;
      throw error;
    },
  });
  const res = response();
  await handler({ method: 'POST', headers: {}, body: '{}' }, res);
  assert.equal(res.statusCode, 401);
});

test('portal file link endpoint stores external links for owned project', async () => {
  const calls = [];
  const handler = createFileLinksHandler({
    requireUserImpl: async () => ({ email: 'buyer@example.com' }),
    records: {
      getCustomerByEmail: async () => ({ id: 'customer-1', email: 'buyer@example.com' }),
      getProjectForCustomer: async () => ({ id: 'project-1', order_id: null }),
      createProjectFile: async (input) => { calls.push({ type: 'file', input }); return { id: 'file-1' }; },
      updateProject: async (projectId, patch) => { calls.push({ type: 'project', projectId, patch }); },
      createProjectEvent: async (event) => { calls.push({ type: 'event', event }); },
      createEmailEvent: async (event) => { calls.push({ type: 'email', event }); },
    },
    sendEmail: async () => ({ id: 'email-1' }),
  });

  const res = response();
  await handler({
    method: 'POST',
    headers: {},
    body: JSON.stringify({ projectId: 'project-1', url: 'https://drive.test/song' }),
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(calls.find((call) => call.type === 'file').input.uploadLink, 'https://drive.test/song');
  assert.equal(calls.find((call) => call.type === 'project').patch.status, 'files_submitted');
  assert.equal(calls.find((call) => call.type === 'email').event.status, 'sent');
});

function response() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
