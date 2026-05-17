const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildProjectCode,
  normalizeEmail,
  upsertCustomer,
  upsertPaymentAndOrder,
  createProjectEvent,
} = require('../lib/db/studio-records');

test('normalizeEmail lowercases and validates customer email', () => {
  assert.equal(normalizeEmail(' Buyer@Example.COM '), 'buyer@example.com');
  assert.equal(normalizeEmail('not-an-email'), null);
});

test('buildProjectCode pads numeric ids for customer-facing project codes', () => {
  assert.equal(buildProjectCode(123), 'DCR-000123');
});

test('upsertCustomer posts by email conflict and returns the customer', async () => {
  const calls = [];
  const customer = await upsertCustomer({
    email: 'Buyer@Example.com',
    name: 'Buyer Name',
  }, {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse([{ id: 'customer-1', email: 'buyer@example.com' }]);
    },
  });

  assert.equal(customer.id, 'customer-1');
  assert.match(calls[0].url, /\/customers\?on_conflict=email&select=/);
  assert.equal(calls[0].body.email, 'buyer@example.com');
  assert.equal(calls[0].body.name, 'Buyer Name');
});

test('upsertCustomer omits name when caller only knows the email', async () => {
  const calls = [];
  await upsertCustomer({
    email: 'buyer@example.com',
  }, {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse([{ id: 'customer-1', email: 'buyer@example.com', name: 'Existing Name' }]);
    },
  });

  assert.deepEqual(calls[0].body, { email: 'buyer@example.com' });
});

test('supabase errors parse non-json response text once', async () => {
  const { supabaseRequest } = require('../lib/db/studio-records');

  await assert.rejects(() => supabaseRequest('/customers', {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async () => ({
      ok: false,
      status: 500,
      async text() { return 'plain failure'; },
    }),
  }), /Supabase request failed: 500 plain failure/);
});

test('createProjectEvent stores timeline event metadata', async () => {
  const calls = [];
  await createProjectEvent({
    projectId: 'project-1',
    eventType: 'status_changed',
    actorType: 'system',
    message: 'Project moved to awaiting files.',
    metadata: { status: 'awaiting_files' },
  }, {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse([{ id: 'event-1' }]);
    },
  });

  assert.match(calls[0].url, /\/project_events\?select=/);
  assert.equal(calls[0].body.actor_type, 'system');
  assert.equal(calls[0].body.metadata.status, 'awaiting_files');
});

test('upsertPaymentAndOrder stores project total separately from captured deposit', async () => {
  const calls = [];
  await upsertPaymentAndOrder({
    customer: { id: 'customer-1' },
    payment: {
      paypalTxnId: 'CAPTURE-1',
      paypalOrderId: 'ORDER-1',
      status: 'paid',
      totalAmount: '796.00',
      amountDueNow: '398.00',
      remainingBalance: '398.00',
      orderSummary: { paymentMode: 'deposit' },
    },
  }, {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      if (String(url).includes('/orders')) return jsonResponse([{ id: 'order-1' }]);
      if (String(url).includes('/payments')) return jsonResponse([{ id: 'payment-1' }]);
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(calls[0].body.total_amount, '796.00');
  assert.equal(calls[0].body.amount_due_now, '398.00');
  assert.equal(calls[0].body.remaining_balance, '398.00');
  assert.equal(calls[1].body.amount, '398.00');
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(body); },
  };
}
