const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getPayPalAccessToken,
  getHeader,
  parseCompletedPaymentEvent,
  verifyPayPalWebhookSignature,
} = require('../lib/paypal/webhook');

test('getHeader reads PayPal headers case-insensitively', () => {
  assert.equal(getHeader({ 'paypal-transmission-id': 'abc' }, 'PAYPAL-TRANSMISSION-ID'), 'abc');
});

test('parseCompletedPaymentEvent extracts completed capture data', () => {
  const record = parseCompletedPaymentEvent({
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: 'CAPTURE-123',
      status: 'COMPLETED',
      payer: { email_address: 'Buyer@Example.com' },
      amount: { value: '149.00', currency_code: 'USD' },
      supplementary_data: { related_ids: { order_id: 'ORDER-123' } },
    },
  });

  assert.equal(record.paypalTxnId, 'CAPTURE-123');
  assert.equal(record.paypalOrderId, 'ORDER-123');
  assert.equal(record.buyerEmail, 'buyer@example.com');
  assert.equal(record.totalAmount, '149.00');
});

test('parseCompletedPaymentEvent ignores unsupported or incomplete events', () => {
  assert.equal(parseCompletedPaymentEvent({ event_type: 'PAYMENT.CAPTURE.DENIED', resource: {} }), null);
  assert.equal(parseCompletedPaymentEvent({
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: { status: 'PENDING' },
  }), null);
});

test('verifyPayPalWebhookSignature posts PayPal headers and event to verification API', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/v1/oauth2/token')) return jsonResponse({ access_token: 'token' });
    if (url.endsWith('/v1/notifications/verify-webhook-signature')) {
      return jsonResponse({ verification_status: 'SUCCESS' });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const verified = await verifyPayPalWebhookSignature({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
      'paypal-transmission-id': 'transmission-123',
      'paypal-transmission-sig': 'sig-123',
      'paypal-transmission-time': '2026-05-16T12:00:00Z',
    },
    webhookEvent: { id: 'WH-EVENT' },
    fetchImpl,
    env: {
      PAYPAL_CLIENT_ID: 'client-id',
      PAYPAL_CLIENT_SECRET: 'client-secret',
      PAYPAL_ENV: 'sandbox',
      PAYPAL_WEBHOOK_ID: 'WEBHOOK-123',
    },
  });

  assert.equal(verified, true);
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[1].options.body).webhook_id, 'WEBHOOK-123');
});

test('getPayPalAccessToken attaches non-secret diagnostics on auth failure', async () => {
  const fetchImpl = async () => jsonResponse({
    error: 'invalid_client',
    error_description: 'Client Authentication failed',
  }, 401);

  await assert.rejects(async () => {
    await getPayPalAccessToken({
      fetchImpl,
      env: {
        PAYPAL_CLIENT_ID: 'AcileAmmKwccfUWrNRt7kExample',
        PAYPAL_CLIENT_SECRET: 'secret-value',
        PAYPAL_ENV: 'live',
      },
    });
  }, (error) => {
    assert.equal(error.diagnostics.paypalEnv, 'live');
    assert.equal(error.diagnostics.paypalBaseUrl, 'https://api-m.paypal.com');
    assert.equal(error.diagnostics.clientIdPrefix, 'AcileA');
    assert.equal(error.diagnostics.clientIdSuffix, 'xample');
    assert.equal(error.diagnostics.clientSecretPresent, true);
    assert.equal(error.diagnostics.clientSecretLength, 12);
    return true;
  });
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
