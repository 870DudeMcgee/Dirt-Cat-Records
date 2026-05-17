const test = require('node:test');
const assert = require('node:assert/strict');
const {
  upsertPaidOrder,
} = require('../lib/db/supabase-orders');

test('upsertPaidOrder upserts customer by email and order by PayPal transaction id', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/customers')) return jsonResponse([{ id: 'customer-123', email: 'buyer@example.com' }]);
    if (String(url).includes('/orders')) return jsonResponse([{ id: 'order-123', paypal_txn_id: 'CAPTURE-123' }]);
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await upsertPaidOrder({
    paypalTxnId: 'CAPTURE-123',
    buyerEmail: 'Buyer@Example.com',
    status: 'paid',
    totalAmount: '149.00',
  }, {
    fetchImpl,
    env: {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    },
  });

  assert.equal(result.customer.id, 'customer-123');
  assert.equal(result.order.id, 'order-123');
  assert.match(calls[0].url, /\/rest\/v1\/customers\?on_conflict=email&select=id%2Cemail$/);
  assert.match(calls[1].url, /\/rest\/v1\/orders\?on_conflict=paypal_txn_id&select=/);
  assert.equal(JSON.parse(calls[0].options.body).email, 'buyer@example.com');
});

test('upsertPaidOrder requires Supabase server credentials', async () => {
  await assert.rejects(() => upsertPaidOrder({
    paypalTxnId: 'CAPTURE-123',
    buyerEmail: 'buyer@example.com',
    status: 'paid',
    totalAmount: '149.00',
  }, {
    fetchImpl: async () => jsonResponse([]),
    env: {},
  }), /SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}
