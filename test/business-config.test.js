const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getBusinessConfig,
  redactBusinessConfig,
} = require('../lib/automation/business-config');

test('getBusinessConfig builds template-ready Dirt Cat defaults', () => {
  const config = getBusinessConfig({
    ADMIN_EMAIL: 'josh@example.com',
    SITE_URL: 'https://dirtcatrecords.com',
    RESEND_REPLY_TO_EMAIL: 'studio@example.com',
  });

  assert.equal(config.businessName, 'Dirt Cat Records');
  assert.equal(config.adminEmail, 'josh@example.com');
  assert.equal(config.siteUrl, 'https://dirtcatrecords.com');
  assert.equal(config.testPrefix, '[TEST]');
  assert.equal(config.driveFolderPrefix, 'TEST');
  assert.deepEqual(config.providers, {
    database: 'supabase',
    storage: 'google_drive',
    email: 'resend',
    payments: 'paypal',
    auth: 'supabase_magic_link',
  });
});

test('redactBusinessConfig exposes presence but not secrets', () => {
  const redacted = redactBusinessConfig(getBusinessConfig({
    ADMIN_EMAIL: 'josh@example.com',
    SITE_URL: 'https://dirtcatrecords.com',
    SUPABASE_SERVICE_ROLE_KEY: 'service-secret',
    PAYPAL_CLIENT_SECRET: 'paypal-secret',
  }));

  assert.equal(redacted.secrets.SUPABASE_SERVICE_ROLE_KEY.present, true);
  assert.equal(redacted.secrets.SUPABASE_SERVICE_ROLE_KEY.value, undefined);
  assert.equal(redacted.secrets.PAYPAL_CLIENT_SECRET.present, true);
});
