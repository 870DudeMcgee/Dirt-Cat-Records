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
  const handler = createPaypalWebhookHandler({
    verifySignature: async () => {
      throw new Error('PAYPAL_WEBHOOK_ID is required.');
    },
    logError: () => {},
  });
  const res = createResponse();

  await handler({ method: 'POST', headers: {}, body: { id: 'WH-EVENT' } }, res);

  assert.equal(res.statusCode, 500);
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
