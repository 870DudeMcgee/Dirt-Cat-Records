const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildProjectCode,
  createAdminQuote,
  createAutomationTestRun,
  deleteStudioRecord,
  normalizeEmail,
  getAutomationTestRun,
  listAutomationTestRuns,
  sendAdminQuote,
  updateAutomationTestRun,
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

test('createAdminQuote stores quote, line items, updates active quote, and logs an admin event', async () => {
  const calls = [];
  const quote = await createAdminQuote('project-1', {
    baseServiceId: 'custom_deposit',
    songCount: 1,
    paymentMode: 'deposit',
    catalogTotalCents: 50000,
    adjustmentCents: -5000,
    depositCents: 22500,
    notes: 'Bundle discount for EP scope.',
    expiresAt: '2026-06-01T00:00:00.000Z',
    lineItems: [
      { itemType: 'service', itemId: 'custom_deposit', label: 'Custom Project Deposit', quantity: 1, unitCents: 50000 },
      { itemType: 'adjustment', label: 'Bundle discount', quantity: 1, unitCents: -5000 },
    ],
  }, {
    adminEmail: 'josh@example.com',
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options = {}) => {
      const method = options.method || 'GET';
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url: String(url), method, body });

      if (String(url).includes('/projects?id=eq.project-1') && method === 'GET') {
        return jsonResponse([{ id: 'project-1', customer_id: 'customer-1', status: 'reviewing' }]);
      }
      if (String(url).includes('/quotes') && method === 'POST') {
        return jsonResponse([{ id: 'quote-1', project_id: 'project-1', customer_id: 'customer-1', status: 'draft', final_total_cents: 45000, payment_mode: 'deposit', deposit_cents: 22500, balance_cents: 22500 }]);
      }
      if (String(url).includes('/quote_line_items') && method === 'POST') {
        return jsonResponse([{ id: 'line-item-1', quote_id: 'quote-1' }]);
      }
      if (String(url).includes('/projects?id=eq.project-1') && method === 'PATCH') {
        return jsonResponse([{ id: 'project-1', active_quote_id: 'quote-1', status: 'quoted' }]);
      }
      if (String(url).includes('/project_events') && method === 'POST') {
        return jsonResponse([{ id: 'event-1', project_id: 'project-1', event_type: 'admin_quote_created' }]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  assert.equal(quote.id, 'quote-1');
  assert.equal(quote.finalTotalCents, 45000);
  assert.equal(quote.paymentMode, 'deposit');
  assert.equal(quote.depositCents, 22500);
  assert.equal(quote.balanceCents, 22500);

  const quoteInsert = calls.find((call) => call.url.includes('/quotes') && call.method === 'POST');
  assert.equal(quoteInsert.body.final_total_cents, 45000);

  const lineItemInserts = calls.filter((call) => call.url.includes('/quote_line_items') && call.method === 'POST');
  assert.equal(lineItemInserts.length, 2);

  const projectPatch = calls.find((call) => call.url.includes('/projects?id=eq.project-1') && call.method === 'PATCH');
  assert.equal(projectPatch.body.active_quote_id, 'quote-1');
  assert.equal(projectPatch.body.status, 'quoted');

  const eventInsert = calls.find((call) => call.url.includes('/project_events') && call.method === 'POST');
  assert.equal(eventInsert.body.event_type, 'admin_quote_created');
  assert.equal(eventInsert.body.metadata.adminEmail, 'josh@example.com');
});

test('sendAdminQuote sends quote email, updates quote and project status, and logs email event', async () => {
  const calls = [];
  const quote = await sendAdminQuote('project-1', 'quote-1', {
    adminEmail: 'josh@example.com',
    env: {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      SITE_URL: 'https://dirtcatrecords.com',
    },
    fetchImpl: async (url, options = {}) => {
      const method = options.method || 'GET';
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url: String(url), method, body });

      if (String(url).includes('/projects?id=eq.project-1') && method === 'GET') {
        return jsonResponse([{ id: 'project-1', customer_id: 'customer-1', project_code: 'DCR-000123', status: 'quoted', active_quote_id: 'quote-1', customers: { id: 'customer-1', email: 'client@example.com', name: 'Client' } }]);
      }
      if (String(url).includes('/quotes?id=eq.quote-1') && method === 'GET') {
        return jsonResponse([{ id: 'quote-1', project_id: 'project-1', customer_id: 'customer-1', status: 'draft', final_total_cents: 45000 }]);
      }
      if (String(url).includes('/quotes?id=eq.quote-1') && method === 'PATCH') {
        return jsonResponse([{ id: 'quote-1', status: 'sent', sent_at: '2026-05-19T15:00:00.000Z' }]);
      }
      if (String(url).includes('/projects?id=eq.project-1') && method === 'PATCH') {
        return jsonResponse([{ id: 'project-1', active_quote_id: 'quote-1', status: 'quote_sent' }]);
      }
      if (String(url).includes('/project_events') && method === 'POST') {
        return jsonResponse([{ id: 'event-1', project_id: 'project-1', event_type: 'admin_quote_sent' }]);
      }
      if (String(url).includes('/email_events') && method === 'POST') {
        return jsonResponse([{ id: 'email-1', project_id: 'project-1', email_type: 'quote_sent', status: 'sent' }]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
    sendEmailImpl: async (message) => {
      calls.push({ type: 'sendEmail', message });
      return { id: 'resend-1' };
    },
  });

  assert.equal(quote.id, 'quote-1');
  assert.equal(quote.status, 'sent');

  const sendEmailCall = calls.find((call) => call.type === 'sendEmail');
  assert.equal(sendEmailCall.message.emailType, 'quote_sent');
  assert.equal(sendEmailCall.message.to, 'client@example.com');
  assert.match(sendEmailCall.message.data.quoteUrl, /portal\.html\?project=project-1&quote=quote-1/);
  assert.equal(sendEmailCall.message.data.totalLabel, '$450.00');

  const projectPatch = calls.find((call) => call.url && call.url.includes('/projects?id=eq.project-1') && call.method === 'PATCH');
  assert.equal(projectPatch.body.status, 'quote_sent');

  const emailEventInsert = calls.find((call) => call.url && call.url.includes('/email_events') && call.method === 'POST');
  assert.equal(emailEventInsert.body.email_type, 'quote_sent');
  assert.equal(emailEventInsert.body.status, 'sent');
});

test('createAdminQuote can build quote line items from catalog inputs and adjustment', async () => {
  const calls = [];
  await createAdminQuote('project-1', {
    baseServiceId: 'mix',
    songCount: 2,
    selectedAddOns: [{ addOnId: 'rushDelivery', quantity: 1 }],
    paymentMode: 'full',
    adjustmentCents: -1000,
    adjustmentLabel: 'Loyalty discount',
    expiresAt: '2026-06-01T00:00:00.000Z',
  }, {
    adminEmail: 'josh@example.com',
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options = {}) => {
      const method = options.method || 'GET';
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ url: String(url), method, body });

      if (String(url).includes('/projects?id=eq.project-1') && method === 'GET') {
        return jsonResponse([{ id: 'project-1', customer_id: 'customer-1', status: 'reviewing' }]);
      }
      if (String(url).includes('/quotes') && method === 'POST') {
        return jsonResponse([{ id: 'quote-1', project_id: 'project-1', customer_id: 'customer-1', status: 'draft', final_total_cents: 33220, payment_mode: 'full', deposit_cents: 0, balance_cents: 0 }]);
      }
      if (String(url).includes('/quote_line_items') && method === 'POST') {
        return jsonResponse([{ id: 'line-item-1', quote_id: 'quote-1' }]);
      }
      if (String(url).includes('/projects?id=eq.project-1') && method === 'PATCH') {
        return jsonResponse([{ id: 'project-1', active_quote_id: 'quote-1', status: 'quoted' }]);
      }
      if (String(url).includes('/project_events') && method === 'POST') {
        return jsonResponse([{ id: 'event-1', project_id: 'project-1', event_type: 'admin_quote_created' }]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  const lineItemBodies = calls
    .filter((call) => call.url.includes('/quote_line_items') && call.method === 'POST')
    .map((call) => call.body);

  assert.ok(lineItemBodies.some((item) => item.item_type === 'service'));
  assert.ok(lineItemBodies.some((item) => item.item_type === 'add_on'));
  assert.ok(lineItemBodies.some((item) => item.item_type === 'adjustment' && item.label === 'Loyalty discount'));
});

test('createAutomationTestRun stores a redacted report shell', async () => {
  const calls = [];
  const run = await createAutomationTestRun({
    id: 'test-run-1',
    mode: 'simulation',
    status: 'running',
    businessName: 'Dirt Cat Records',
    report: { steps: [] },
  }, {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse([{ id: 'test-run-1', mode: 'simulation', status: 'running' }]);
    },
  });

  assert.equal(run.id, 'test-run-1');
  assert.match(calls[0].url, /\/automation_test_runs\?select=/);
  assert.equal(calls[0].body.business_name, 'Dirt Cat Records');
  assert.deepEqual(calls[0].body.report, { steps: [] });
});

test('updateAutomationTestRun patches report and cleanup status', async () => {
  const calls = [];
  await updateAutomationTestRun('test-run-1', {
    status: 'passed',
    cleanupStatus: 'pending',
    report: { steps: [{ key: 'simulation', status: 'passed' }] },
    finishedAt: '2026-05-17T12:00:00.000Z',
  }, {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse([{ id: 'test-run-1', status: 'passed' }]);
    },
  });

  assert.match(calls[0].url, /id=eq\.test-run-1/);
  assert.equal(calls[0].body.cleanup_status, 'pending');
  assert.equal(calls[0].body.finished_at, '2026-05-17T12:00:00.000Z');
});

test('getAutomationTestRun returns null when run does not exist', async () => {
  const run = await getAutomationTestRun('missing-run', {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async () => jsonResponse([]),
  });

  assert.equal(run, null);
});

test('listAutomationTestRuns requests recent automation test runs', async () => {
  const calls = [];
  await listAutomationTestRuns({
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url) => {
      calls.push(String(url));
      return jsonResponse([]);
    },
  });

  assert.match(calls[0], /\/automation_test_runs\?select=/);
  assert.match(calls[0], /order=started_at\.desc/);
});

test('deleteStudioRecord deletes only cleanup-allowed records', async () => {
  const calls = [];
  await deleteStudioRecord('orders', 'order-1', {
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), method: options.method });
      return jsonResponse({});
    },
  });

  assert.match(calls[0].url, /\/orders\?id=eq\.order-1/);
  assert.equal(calls[0].method, 'DELETE');
  await assert.rejects(() => deleteStudioRecord('customers', 'customer-1'), /Cleanup cannot delete customers records/);
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(body); },
  };
}
