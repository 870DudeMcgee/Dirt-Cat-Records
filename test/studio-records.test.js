const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildProjectCode,
  normalizeEmail,
  upsertCustomer,
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

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
    async text() { return JSON.stringify(body); },
  };
}
