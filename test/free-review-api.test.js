const test = require('node:test');
const assert = require('node:assert/strict');
const { createFreeReviewHandler } = require('../api/public/free-review');

test('free review endpoint validates and starts workflow', async () => {
  const handler = createFreeReviewHandler({
    rateStore: new Map(),
    runWorkflow: async (input) => {
      assert.equal(input.email, 'buyer@example.com');
      assert.equal(input.artistName, 'Dude McGee');
      return { project: { id: 'project-1' } };
    },
  });

  const res = createResponse();
  await handler({
    method: 'POST',
    headers: {},
    body: JSON.stringify({
      email: 'buyer@example.com',
      name: 'Buyer',
      artistName: 'Dude McGee',
      projectTitle: 'Song One',
      message: 'Please review this mix.',
    }),
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.projectId, 'project-1');
});

test('free review endpoint rejects invalid email', async () => {
  const handler = createFreeReviewHandler({
    rateStore: new Map(),
    runWorkflow: async () => { throw new Error('should not run'); },
  });
  const res = createResponse();
  await handler({ method: 'POST', headers: {}, body: JSON.stringify({ email: 'bad' }) }, res);
  assert.equal(res.statusCode, 400);
});

test('free review endpoint rejects null JSON payload', async () => {
  const handler = createFreeReviewHandler({
    rateStore: new Map(),
    runWorkflow: async () => { throw new Error('should not run'); },
  });
  const res = createResponse();
  await handler({ method: 'POST', headers: {}, body: 'null' }, res);
  assert.equal(res.statusCode, 400);
});

test('free review endpoint rejects whitespace-only message', async () => {
  const handler = createFreeReviewHandler({
    rateStore: new Map(),
    runWorkflow: async () => { throw new Error('should not run'); },
  });
  const res = createResponse();
  await handler({
    method: 'POST',
    headers: {},
    body: JSON.stringify({ email: 'buyer@example.com', message: '   ' }),
  }, res);
  assert.equal(res.statusCode, 400);
});

test('free review endpoint rejects honeypot submissions', async () => {
  const handler = createFreeReviewHandler({
    rateStore: new Map(),
    runWorkflow: async () => { throw new Error('should not run'); },
  });
  const res = createResponse();
  await handler({
    method: 'POST',
    headers: {},
    body: JSON.stringify({ email: 'buyer@example.com', message: 'hello', website: 'bot' }),
  }, res);
  assert.equal(res.statusCode, 400);
});

test('free review endpoint rejects invalid reference links', async () => {
  const handler = createFreeReviewHandler({
    rateStore: new Map(),
    runWorkflow: async () => { throw new Error('should not run'); },
  });
  const res = createResponse();
  await handler({
    method: 'POST',
    headers: {},
    body: JSON.stringify({ email: 'buyer@example.com', message: 'hello', referenceLinks: ['javascript:alert(1)'] }),
  }, res);
  assert.equal(res.statusCode, 400);
});

test('free review endpoint rate limits repeat submissions by email and ip', async () => {
  let workflowCalls = 0;
  const handler = createFreeReviewHandler({
    rateStore: new Map(),
    rateLimitMs: 1000,
    now: () => 1000,
    runWorkflow: async () => {
      workflowCalls += 1;
      return { project: { id: 'project-1' } };
    },
  });

  const first = createResponse();
  const second = createResponse();
  const request = {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: JSON.stringify({ email: 'buyer@example.com', message: 'hello' }),
  };

  await handler(request, first);
  await handler(request, second);

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 429);
  assert.equal(workflowCalls, 1);
});

test('free review endpoint rate limits repeat submissions from same ip with different emails', async () => {
  let workflowCalls = 0;
  const handler = createFreeReviewHandler({
    rateStore: new Map(),
    rateLimitMs: 1000,
    now: () => 1000,
    runWorkflow: async () => {
      workflowCalls += 1;
      return { project: { id: 'project-1' } };
    },
  });

  const first = createResponse();
  const second = createResponse();

  await handler({
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: JSON.stringify({ email: 'buyer@example.com', message: 'hello' }),
  }, first);
  await handler({
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: JSON.stringify({ email: 'other@example.com', message: 'hello' }),
  }, second);

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 429);
  assert.equal(workflowCalls, 1);
});

function createResponse() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
