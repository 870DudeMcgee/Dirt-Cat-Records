const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getBearerToken,
  isAdminEmail,
  isLocalAdminBypassAllowed,
  requireAdmin,
} = require('../lib/auth/supabase-auth');

test('getBearerToken extracts bearer token', () => {
  assert.equal(getBearerToken({ authorization: 'Bearer abc123' }), 'abc123');
  assert.equal(getBearerToken({ authorization: 'Basic abc123' }), null);
});

test('isAdminEmail compares configured admin email case-insensitively', () => {
  assert.equal(isAdminEmail('Josh@Example.com', { ADMIN_EMAIL: 'josh@example.com' }), true);
  assert.equal(isAdminEmail('buyer@example.com', { ADMIN_EMAIL: 'josh@example.com' }), false);
});

test('isLocalAdminBypassAllowed is limited to localhost and explicit opt-in', () => {
  assert.equal(isLocalAdminBypassAllowed({ headers: { host: 'localhost:3000' } }, { ALLOW_LOCAL_ADMIN_BYPASS: '1' }), true);
  assert.equal(isLocalAdminBypassAllowed({ headers: { host: '127.0.0.1:3000' } }, { ALLOW_LOCAL_ADMIN_BYPASS: '1' }), true);
  assert.equal(isLocalAdminBypassAllowed({ headers: { host: 'dirtcatrecords.com' } }, { ALLOW_LOCAL_ADMIN_BYPASS: '1' }), false);
  assert.equal(isLocalAdminBypassAllowed({ headers: { host: 'localhost:3000' } }, { ALLOW_LOCAL_ADMIN_BYPASS: '0' }), false);
});

test('requireAdmin allows explicit localhost bypass for local setup', async () => {
  const user = await requireAdmin(
    { headers: { host: 'localhost:3000' } },
    { env: { ALLOW_LOCAL_ADMIN_BYPASS: '1', ADMIN_EMAIL: 'josh@example.com' } },
  );

  assert.equal(user.email, 'josh@example.com');
  assert.equal(user.localAdminBypass, true);
});
