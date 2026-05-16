const {
  calculateOrder,
  centsToDollars,
} = require('../lib/checkout/pricing');

const PAYPAL_BASE_URLS = Object.freeze({
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
});

function createPaypalOrderHandler(dependencies = {}) {
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  const getEnv = dependencies.getEnv || (() => process.env);

  return async function paypalOrderHandler(req, res) {
    setJsonHeaders(res);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (_error) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    let orderSummary;
    try {
      orderSummary = calculateOrder(body);
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Invalid checkout order' });
    }

    try {
      const env = getEnv();
      const paypalClient = getPaypalClient(env, fetchImpl);
      const paypalOrder = await createPaypalOrder(paypalClient, orderSummary);

      if (!paypalOrder || typeof paypalOrder.id !== 'string') {
        return res.status(502).json({ error: 'PayPal did not return an order id' });
      }

      return res.status(200).json({
        id: paypalOrder.id,
        orderSummary,
      });
    } catch (error) {
      const status = error.statusCode || 500;
      if (status >= 500) {
        console.error('PayPal order creation failed:', error);
      }
      return res.status(status).json({ error: error.publicMessage || 'PayPal order creation failed' });
    }
  };
}

async function createPaypalOrder(paypalClient, orderSummary) {
  return paypalClient.post('/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: centsToDollars(orderSummary.amountDueNowCents),
        },
        description: buildOrderDescription(orderSummary),
      },
    ],
    application_context: {
      brand_name: 'Dirt Cat Records',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
    },
  });
}

function buildOrderDescription(orderSummary) {
  const paymentLabel = orderSummary.paymentMode === 'deposit' ? 'Deposit' : 'Full payment';
  return `${paymentLabel}: ${orderSummary.baseServiceLabel} (${orderSummary.songCount} song${orderSummary.songCount === 1 ? '' : 's'})`;
}

function getPaypalClient(env, fetchImpl) {
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw createHttpError(500, 'PayPal checkout is not configured');
  }

  if (typeof fetchImpl !== 'function') {
    throw createHttpError(500, 'Fetch API is not available');
  }

  const baseUrl = getPaypalBaseUrl(env.PAYPAL_ENV);

  return {
    async post(path, payload) {
      const accessToken = await getPaypalAccessToken({
        baseUrl,
        clientId,
        clientSecret,
        fetchImpl,
      });

      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return readPaypalJsonResponse(response, 'PayPal API request failed');
    },
  };
}

async function getPaypalAccessToken({
  baseUrl,
  clientId,
  clientSecret,
  fetchImpl,
}) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetchImpl(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await readPaypalJsonResponse(response, 'Unable to authenticate with PayPal');
  if (!data.access_token) {
    throw createHttpError(502, 'PayPal access token response was invalid');
  }

  return data.access_token;
}

function getPaypalBaseUrl(paypalEnv) {
  return paypalEnv === 'live' ? PAYPAL_BASE_URLS.live : PAYPAL_BASE_URLS.sandbox;
}

async function readPaypalJsonResponse(response, publicMessage) {
  let data;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    const error = createHttpError(502, publicMessage);
    error.paypalStatus = response.status;
    error.paypalResponse = data;
    throw error;
  }

  return data;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    return req.body ? JSON.parse(req.body) : {};
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}

function setJsonHeaders(res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }
}

function createHttpError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

const handler = createPaypalOrderHandler();

module.exports = handler;
module.exports.createPaypalOrderHandler = createPaypalOrderHandler;
module.exports._private = {
  buildOrderDescription,
  createPaypalOrder,
  getPaypalAccessToken,
  getPaypalBaseUrl,
  getPaypalClient,
  readJsonBody,
  readPaypalJsonResponse,
};
