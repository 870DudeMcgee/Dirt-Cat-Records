const { calculateOrder, centsToDollars } = require("../checkout/pricing");
const { parseOrderMetadata } = require("./order-metadata");
const { routePaymentPurpose } = require("./payment-router");
const {
  createPayPalClient,
  getPayPalBaseUrl: getPayPalBaseUrlFromEnv,
} = require("./client-factory");

const COMPLETED_PAYMENT_EVENTS = new Set([
  "PAYMENT.CAPTURE.COMPLETED",
  "CHECKOUT.ORDER.COMPLETED",
]);

function getHeader(headers, name) {
  if (!headers || !name) return undefined;
  const direct = headers[name];
  if (direct !== undefined) return direct;
  const lowerName = name.toLowerCase();
  const key = Object.keys(headers).find(
    (headerName) => headerName.toLowerCase() === lowerName
  );
  return key ? headers[key] : undefined;
}

function getPayPalBaseUrl(env = process.env) {
  return getPayPalBaseUrlFromEnv(env.PAYPAL_ENV);
}

async function getPayPalAccessToken({
  fetchImpl = fetch,
  env = process.env,
} = {}) {
  try {
    const client = createPayPalClient({
      env,
      fetchImpl,
      mapErrorToHttp: false,
    });
    return await client.getAccessToken();
  } catch (error) {
    const enhanced = new Error(
      `Unable to get PayPal access token: ${error.message || "unknown error"}`
    );
    enhanced.diagnostics = getPayPalCredentialDiagnostics(env);
    throw enhanced;
  }
}

async function verifyPayPalWebhookSignature({
  headers,
  webhookEvent,
  fetchImpl = fetch,
  env = process.env,
}) {
  if (!env.PAYPAL_WEBHOOK_ID) throw new Error("PAYPAL_WEBHOOK_ID is required.");

  const accessToken = await getPayPalAccessToken({ fetchImpl, env });
  const response = await fetchImpl(
    `${getPayPalBaseUrl(env)}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: requirePayPalHeader(headers, "PAYPAL-AUTH-ALGO"),
        cert_url: requirePayPalHeader(headers, "PAYPAL-CERT-URL"),
        transmission_id: requirePayPalHeader(headers, "PAYPAL-TRANSMISSION-ID"),
        transmission_sig: requirePayPalHeader(
          headers,
          "PAYPAL-TRANSMISSION-SIG"
        ),
        transmission_time: requirePayPalHeader(
          headers,
          "PAYPAL-TRANSMISSION-TIME"
        ),
        webhook_id: env.PAYPAL_WEBHOOK_ID,
        webhook_event: webhookEvent,
      }),
    }
  );
  const body = await parseResponseBody(response);
  if (!response.ok)
    throw new Error(
      `Unable to verify PayPal webhook signature: ${formatResponseError(response, body)}`
    );
  return body.verification_status === "SUCCESS";
}

function parseCompletedPaymentEvent(webhookEvent) {
  const paypalResource = extractCompletedPayPalResource(webhookEvent);
  if (!paypalResource) return null;

  const paymentIntent = parsePaymentIntentFromResource(paypalResource.resource);
  return constructPaymentRecord({
    webhookEvent,
    resource: paypalResource.resource,
    capture: paypalResource.capture,
    amount: paypalResource.amount,
    paymentIntent,
  });
}

function extractCompletedPayPalResource(webhookEvent) {
  if (!webhookEvent || !COMPLETED_PAYMENT_EVENTS.has(webhookEvent.event_type))
    return null;
  const resource = webhookEvent.resource || {};
  if (resource.status !== "COMPLETED") return null;

  const capture =
    resource.purchase_units
      ?.flatMap((unit) => unit.payments?.captures || [])
      .filter(Boolean)?.[0] || null;
  const amount = resource.amount || capture?.amount || {};
  const buyerEmail = normalizeEmail(
    resource.payer?.email_address ||
      resource.payer?.email ||
      resource.email_address
  );
  const paypalTxnId = capture?.id || resource.id;

  if (!paypalTxnId)
    throw new Error("Completed PayPal event is missing a transaction id.");
  if (!buyerEmail)
    throw new Error("Completed PayPal event is missing a buyer email.");
  if (!amount.value || !amount.currency_code)
    throw new Error("Completed PayPal event is missing an amount.");
  if (amount.currency_code !== "USD")
    throw new Error(`Unsupported PayPal currency: ${amount.currency_code}`);

  return {
    resource,
    capture,
    amount,
    buyerEmail,
    paypalTxnId,
  };
}

function parsePaymentIntentFromResource(resource) {
  const customId =
    resource.purchase_units?.find((unit) => typeof unit.custom_id === "string")
      ?.custom_id || resource.custom_id;
  if (!customId) return null;

  try {
    const metadata = parseOrderMetadata(customId);
    return routePaymentPurpose(metadata.paymentPurpose, {
      quote: () => ({
        paymentPurpose: "quote",
        projectId: metadata.projectId,
        quoteId: metadata.quoteId,
        totalCents: metadata.totalCents,
        amountDueNowCents: metadata.amountCents,
        remainingBalanceCents: Math.max(
          0,
          metadata.totalCents - metadata.amountCents
        ),
        paymentMode: "full",
      }),
      balance: () => ({
        paymentPurpose: "balance",
        projectId: metadata.projectId,
        totalCents: metadata.totalCents,
        amountDueNowCents: metadata.amountCents,
        remainingBalanceCents: Math.max(
          0,
          metadata.totalCents - metadata.amountCents
        ),
        paymentMode: "full",
      }),
      checkout: () => calculateOrder(metadata),
    });
  } catch (error) {
    throw new Error(
      `Completed PayPal event has invalid checkout metadata: ${error.message}`
    );
  }
}

function constructPaymentRecord({
  webhookEvent,
  resource,
  capture,
  amount,
  paymentIntent,
}) {
  const amountDueNow = normalizeAmount(amount.value);
  return {
    paypalTxnId: capture?.id || resource.id,
    paypalOrderId:
      resource.supplementary_data?.related_ids?.order_id || resource.id || null,
    buyerEmail: normalizeEmail(
      resource.payer?.email_address ||
        resource.payer?.email ||
        resource.email_address
    ),
    buyerName: getBuyerName(resource),
    status: "paid",
    totalAmount: paymentIntent
      ? centsToDollars(paymentIntent.totalCents)
      : amountDueNow,
    amountDueNow,
    remainingBalance: paymentIntent
      ? centsToDollars(paymentIntent.remainingBalanceCents)
      : "0.00",
    currencyCode: amount.currency_code,
    orderSummary: paymentIntent,
    paymentPurpose: paymentIntent?.paymentPurpose || "checkout",
    quoteId: paymentIntent?.quoteId || null,
    projectId: paymentIntent?.projectId || null,
    rawPayload: webhookEvent,
  };
}

function getBuyerName(resource) {
  const name = resource.payer?.name;
  return [name?.given_name, name?.surname].filter(Boolean).join(" ") || null;
}

function requirePayPalHeader(headers, name) {
  const value = getHeader(headers, name);
  if (!value) throw new Error(`Missing PayPal webhook header: ${name}`);
  return value;
}

function normalizeEmail(email) {
  if (!email || typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error("Completed PayPal event has an invalid amount.");
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

function getPayPalCredentialDiagnostics(env = process.env) {
  const clientId = String(env.PAYPAL_CLIENT_ID || "");
  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || "");

  return {
    paypalEnv: env.PAYPAL_ENV || "sandbox",
    paypalBaseUrl: getPayPalBaseUrl(env),
    clientIdPresent: clientId.length > 0,
    clientIdLength: clientId.length,
    clientIdPrefix: clientId.slice(0, 6),
    clientIdSuffix: clientId.slice(-6),
    clientSecretPresent: clientSecret.length > 0,
    clientSecretLength: clientSecret.length,
  };
}

module.exports = {
  getHeader,
  getPayPalAccessToken,
  getPayPalBaseUrl,
  getPayPalCredentialDiagnostics,
  parseCompletedPaymentEvent,
  verifyPayPalWebhookSignature,
};
