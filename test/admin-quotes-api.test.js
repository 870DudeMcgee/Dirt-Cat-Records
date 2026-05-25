const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminQuotesHandler } = require('../lib/api/admin/quotes');

test('admin quotes endpoint rejects non-admin users', async () => {
  const handler = createAdminQuotesHandler({
    requireAdminImpl: async () => {
      const error = new Error('Admin access required.');
      error.statusCode = 403;
      throw error;
    },
  });
  const res = response();

  await handler({ method: 'POST', headers: {}, url: '/api/admin/quotes?action=create', body: {} }, res);

  assert.equal(res.statusCode, 403);
});

test('admin quotes create action validates required input', async () => {
  const handler = createAdminQuotesHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: {
      createAdminQuote: async () => {
        throw new Error('should not be called');
      },
    },
  });
  const res = response();

  await handler({ method: 'POST', headers: {}, url: '/api/admin/quotes?action=create', body: {} }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'projectId is required.');
});

test('admin quotes create action returns quote for admin users', async () => {
  const handler = createAdminQuotesHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: {
      createAdminQuote: async (projectId, payload, options) => ({
        id: 'quote-1',
        projectId,
        status: 'draft',
        finalTotalCents: 45000,
        lineItems: payload.lineItems,
        metadata: { adminEmail: options.adminEmail },
      }),
    },
  });
  const res = response();

  await handler({
    method: 'POST',
    headers: {},
    url: '/api/admin/quotes?action=create',
    body: {
      projectId: 'project-1',
      baseServiceId: 'custom_deposit',
      songCount: 1,
      paymentMode: 'full',
      catalogTotalCents: 45000,
      adjustmentCents: 0,
      lineItems: [{ itemType: 'service', label: 'Custom Project Deposit', quantity: 1, unitCents: 45000 }],
      expiresAt: '2026-06-01T00:00:00.000Z',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.quote.id, 'quote-1');
  assert.equal(res.body.quote.metadata.adminEmail, 'josh@example.com');
});

test('admin quotes send action validates required input', async () => {
  const handler = createAdminQuotesHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: {
      sendAdminQuote: async () => {
        throw new Error('should not be called');
      },
    },
  });
  const res = response();

  await handler({
    method: 'POST',
    headers: {},
    url: '/api/admin/quotes?action=send',
    body: { projectId: 'project-1' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'quoteId is required.');
});

test('admin quotes send action sends quote for admin users', async () => {
  const handler = createAdminQuotesHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
    records: {
      sendAdminQuote: async (projectId, quoteId, options) => ({
        id: quoteId,
        projectId,
        status: 'sent',
        metadata: { adminEmail: options.adminEmail },
      }),
    },
  });
  const res = response();

  await handler({
    method: 'POST',
    headers: {},
    url: '/api/admin/quotes?action=send',
    body: { projectId: 'project-1', quoteId: 'quote-1' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.quote.status, 'sent');
  assert.equal(res.body.quote.metadata.adminEmail, 'josh@example.com');
});

test('admin quotes create action only accepts POST', async () => {
  const handler = createAdminQuotesHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
  });
  const res = response();

  await handler({ method: 'GET', headers: {}, url: '/api/admin/quotes?action=create' }, res);

  assert.equal(res.statusCode, 405);
});

test('admin quotes send action only accepts POST', async () => {
  const handler = createAdminQuotesHandler({
    requireAdminImpl: async () => ({ email: 'josh@example.com' }),
  });
  const res = response();

  await handler({ method: 'GET', headers: {}, url: '/api/admin/quotes?action=send' }, res);

  assert.equal(res.statusCode, 405);
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
