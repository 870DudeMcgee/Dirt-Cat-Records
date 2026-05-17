const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getBearerToken,
  isAdminEmail,
} = require('../lib/auth/supabase-auth');

test('getBearerToken extracts bearer token', () => {
  assert.equal(getBearerToken({ authorization: 'Bearer abc123' }), 'abc123');
  assert.equal(getBearerToken({ authorization: 'Basic abc123' }), null);
});

test('isAdminEmail compares configured admin email case-insensitively', () => {
  assert.equal(isAdminEmail('Josh@Example.com', { ADMIN_EMAIL: 'josh@example.com' }), true);
  assert.equal(isAdminEmail('buyer@example.com', { ADMIN_EMAIL: 'josh@example.com' }), false);
});
