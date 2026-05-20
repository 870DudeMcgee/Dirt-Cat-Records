const { calculateOrder, centsToDollars } = require("../checkout/pricing");
const { parseOrderMetadata } = require("./order-metadata");
const { routePaymentPurpose } = require("./payment-router");
const { createPayPalClient } = require("./client-factory");
const { getPayPalEnvironmentConfig } = require("./environment-config");
const { createPayPalWebhookVerifier } = require("./webhook-verifier");

const COMPLETED_PAYMENT_EVENTS = new Set([
  "PAYMENT.CAPTURE.COMPLETED",
  "CHECKOUT.ORDER.APPROVED",
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
  return getPayPalEnvironmentConfig(env).baseUrl;
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
  const verifier = createPayPalWebhookVerifier({ env, fetchImpl });
  return verifier.verifySignature({ headers, webhookEvent });
}

function parseCompletedPaymentEvent(webhookEvent) {
  return parseCompletedPaymentEventWithContext(webhookEvent);
}

function parseCompletedPaymentEventWithContext(
  webhookEvent,
  { env = process.env } = {}
) {
  const paypalResource = extractCompletedPayPalResource(webhookEvent);
  if (!paypalResource) return null;

  const paymentIntent = parsePaymentIntentFromResource(
    paypalResource.resource,
    {
      env,
    }
  );
  return constructPaymentRecord({
    webhookEvent,
    resource: paypalResource.resource,
    capture: paypalResource.capture,
    amount: paypalResource.amount,
    paymentIntent,
  });
}

async function parsePayPalWebhookEvent(
  webhookEvent,
  { fetchImpl = fetch, env = process.env } = {}
) {
  try {
    return parseCompletedPaymentEventWithContext(webhookEvent, { env });
  } catch (error) {
    if (!shouldHydrateWebhookOrder(error, webhookEvent)) throw error;

    const orderId =
      webhookEvent.resource.supplementary_data.related_ids.order_id;
    const paypalOrder = await fetchPayPalOrder(orderId, { fetchImpl, env });

    return parseCompletedPaymentEventWithContext(
      hydrateWebhookEventFromOrder(webhookEvent, paypalOrder),
      { env }
    );
  }
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

function parsePaymentIntentFromResource(resource, { env = process.env } = {}) {
  const customId =
    resource.purchase_units?.find((unit) => typeof unit.custom_id === "string")
      ?.custom_id || resource.custom_id;
  if (!customId) return null;

  try {
    const metadata = parseOrderMetadata(customId);
    return routePaymentPurpose(
      metadata.paymentPurpose,
      {
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
      },
      { env }
    );
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

function shouldHydrateWebhookOrder(error, webhookEvent) {
  return (
    /missing a buyer email/i.test(error?.message || "") &&
    webhookEvent?.event_type === "PAYMENT.CAPTURE.COMPLETED" &&
    typeof webhookEvent?.resource?.supplementary_data?.related_ids?.order_id ===
      "string"
  );
}

async function fetchPayPalOrder(
  orderId,
  { fetchImpl = fetch, env = process.env } = {}
) {
  const client = createPayPalClient({
    env,
    fetchImpl,
    mapErrorToHttp: false,
  });

  try {
    return await client.get(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`
    );
  } catch (error) {
    throw new Error(
      `Unable to load related PayPal order ${orderId}: ${error.message || "unknown error"}`
    );
  }
}

function hydrateWebhookEventFromOrder(webhookEvent, paypalOrder) {
  return {
    ...webhookEvent,
    resource: {
      ...webhookEvent.resource,
      payer: webhookEvent.resource?.payer || paypalOrder?.payer,
      payment_source:
        webhookEvent.resource?.payment_source || paypalOrder?.payment_source,
      purchase_units:
        webhookEvent.resource?.purchase_units || paypalOrder?.purchase_units,
    },
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
  const paypalConfig = getPayPalEnvironmentConfig(env);
  const { clientId, clientSecret } = paypalConfig;

  return {
    paypalEnv: paypalConfig.paypalEnv,
    paypalBaseUrl: paypalConfig.baseUrl,
    clientIdPresent: paypalConfig.clientIdPresent,
    clientIdLength: clientId.length,
    clientIdPrefix: clientId.slice(0, 6),
    clientIdSuffix: clientId.slice(-6),
    clientSecretPresent: paypalConfig.clientSecretPresent,
    clientSecretLength: clientSecret.length,
    webhookIdPresent: paypalConfig.webhookIdPresent,
  };
}

module.exports = {
  fetchPayPalOrder,
  getHeader,
  getPayPalAccessToken,
  getPayPalBaseUrl,
  getPayPalCredentialDiagnostics,
  parseCompletedPaymentEvent,
  parsePayPalWebhookEvent,
  verifyPayPalWebhookSignature,
};
