const test = require('node:test');
const assert = require('node:assert/strict');
const { createFreeReviewHandler } = require('../api/public/free-review');

test('free review endpoint validates and starts workflow', async () => {
  const handler = createFreeReviewHandler({
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
    runWorkflow: async () => { throw new Error('should not run'); },
  });
  const res = createResponse();
  await handler({ method: 'POST', headers: {}, body: JSON.stringify({ email: 'bad' }) }, res);
  assert.equal(res.statusCode, 400);
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
