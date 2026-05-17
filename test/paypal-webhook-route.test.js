const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPaypalWebhookHandler,
} = require('../api/webhooks/paypal');

test('paypal webhook route rejects invalid signatures', async () => {
  let upsertCalled = false;
  const handler = createPaypalWebhookHandler({
    verifySignature: async () => false,
    upsertOrder: async () => {
      upsertCalled = true;
    },
  });
  const res = createResponse();

  await handler({ method: 'POST', headers: {}, body: { id: 'WH-EVENT' } }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(upsertCalled, false);
});

test('paypal webhook route upserts completed payment events', async () => {
  const upserts = [];
  const handler = createPaypalWebhookHandler({
    verifySignature: async () => true,
    upsertOrder: async (record) => {
      upserts.push(record);
      return { order: { id: 'order-123' } };
    },
  });
  const res = createResponse();

  await handler({
    method: 'POST',
    headers: {},
    body: {
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAPTURE-123',
        status: 'COMPLETED',
        payer: { email_address: 'buyer@example.com' },
        amount: { value: '149.00', currency_code: 'USD' },
      },
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(upserts[0].paypalTxnId, 'CAPTURE-123');
  assert.deepEqual(res.body, { ok: true, ignored: false, orderId: 'order-123' });
});

test('paypal webhook route treats server configuration errors as internal failures', async () => {
  const logs = [];
  const handler = createPaypalWebhookHandler({
    verifySignature: async () => {
      const error = new Error('PAYPAL_WEBHOOK_ID is required.');
      error.headers = { authorization: 'Bearer secret-token' };
      error.webhookEvent = { payer: { email_address: 'buyer@example.com' } };
      throw error;
    },
    logError: (...args) => logs.push(args),
  });
  const res = createResponse();

  await handler({ method: 'POST', headers: {}, body: { id: 'WH-EVENT' } }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(logs.length, 1);
  assert.deepEqual(logs[0][1], {
    name: 'Error',
    message: 'PAYPAL_WEBHOOK_ID is required.',
  });
});

test('paypal webhook route rejects oversized string bodies', async () => {
  const handler = createPaypalWebhookHandler();
  const res = createResponse();
  const oversizedBody = JSON.stringify({ data: 'x'.repeat(65 * 1024) });

  await handler({ method: 'POST', headers: {}, body: oversizedBody }, res);

  assert.equal(res.statusCode, 413);
  assert.deepEqual(res.body, { error: 'Webhook payload is too large' });
});

test('paypal webhook route rejects oversized content-length before reading stream', async () => {
  const handler = createPaypalWebhookHandler();
  const res = createResponse();

  await handler({
    method: 'POST',
    headers: { 'content-length': String(65 * 1024) },
    async *[Symbol.asyncIterator]() {
      throw new Error('stream should not be read');
    },
  }, res);

  assert.equal(res.statusCode, 413);
  assert.deepEqual(res.body, { error: 'Webhook payload is too large' });
});

function createResponse() {
  return {
    statusCode: 200,
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
