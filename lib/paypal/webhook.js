const COMPLETED_PAYMENT_EVENTS = new Set([
  'PAYMENT.CAPTURE.COMPLETED',
  'CHECKOUT.ORDER.COMPLETED',
]);

function getHeader(headers, name) {
  if (!headers || !name) return undefined;
  const direct = headers[name];
  if (direct !== undefined) return direct;
  const lowerName = name.toLowerCase();
  const key = Object.keys(headers).find((headerName) => headerName.toLowerCase() === lowerName);
  return key ? headers[key] : undefined;
}

function getPayPalBaseUrl(env = process.env) {
  return env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken({ fetchImpl = fetch, env = process.env } = {}) {
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required.');

  const response = await fetchImpl(`${getPayPalBaseUrl(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const body = await parseResponseBody(response);
  if (!response.ok || !body.access_token) {
    throw new Error(`Unable to get PayPal access token: ${formatResponseError(response, body)}`);
  }
  return body.access_token;
}

async function verifyPayPalWebhookSignature({ headers, webhookEvent, fetchImpl = fetch, env = process.env }) {
  if (!env.PAYPAL_WEBHOOK_ID) throw new Error('PAYPAL_WEBHOOK_ID is required.');

  const accessToken = await getPayPalAccessToken({ fetchImpl, env });
  const response = await fetchImpl(`${getPayPalBaseUrl(env)}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: requirePayPalHeader(headers, 'PAYPAL-AUTH-ALGO'),
      cert_url: requirePayPalHeader(headers, 'PAYPAL-CERT-URL'),
      transmission_id: requirePayPalHeader(headers, 'PAYPAL-TRANSMISSION-ID'),
      transmission_sig: requirePayPalHeader(headers, 'PAYPAL-TRANSMISSION-SIG'),
      transmission_time: requirePayPalHeader(headers, 'PAYPAL-TRANSMISSION-TIME'),
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: webhookEvent,
    }),
  });
  const body = await parseResponseBody(response);
  if (!response.ok) throw new Error(`Unable to verify PayPal webhook signature: ${formatResponseError(response, body)}`);
  return body.verification_status === 'SUCCESS';
}

function parseCompletedPaymentEvent(webhookEvent) {
  if (!webhookEvent || !COMPLETED_PAYMENT_EVENTS.has(webhookEvent.event_type)) return null;
  const resource = webhookEvent.resource || {};
  if (resource.status !== 'COMPLETED') return null;

  const capture = resource.purchase_units?.flatMap((unit) => unit.payments?.captures || []).filter(Boolean)?.[0];
  const amount = resource.amount || capture?.amount || {};
  const buyerEmail = normalizeEmail(resource.payer?.email_address || resource.payer?.email || resource.email_address);
  const paypalTxnId = capture?.id || resource.id;
  if (!paypalTxnId) throw new Error('Completed PayPal event is missing a transaction id.');
  if (!buyerEmail) throw new Error('Completed PayPal event is missing a buyer email.');
  if (!amount.value || !amount.currency_code) throw new Error('Completed PayPal event is missing an amount.');
  if (amount.currency_code !== 'USD') throw new Error(`Unsupported PayPal currency: ${amount.currency_code}`);
  return {
    paypalTxnId,
    paypalOrderId: resource.supplementary_data?.related_ids?.order_id || resource.id || null,
    buyerEmail,
    status: 'paid',
    totalAmount: normalizeAmount(amount.value),
    currencyCode: amount.currency_code,
  };
}

function requirePayPalHeader(headers, name) {
  const value = getHeader(headers, name);
  if (!value) throw new Error(`Missing PayPal webhook header: ${name}`);
  return value;
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Completed PayPal event has an invalid amount.');
  return amount.toFixed(2);
}

async function parseResponseBody(response) {
  try {
    return await response.json();
  } catch (_error) {
    const text = await response.text();
    return text ? { message: text } : {};
  }
}

function formatResponseError(response, body) {
  return `${response.status} ${body?.message || body?.error_description || body?.error || JSON.stringify(body)}`;
}

module.exports = {
  getHeader,
  getPayPalAccessToken,
  getPayPalBaseUrl,
  parseCompletedPaymentEvent,
  verifyPayPalWebhookSignature,
};
