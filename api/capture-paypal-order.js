const { ensureRuntimeEnv } = require('../lib/env/runtime');
const {
  calculateOrder,
} = require('../lib/checkout/pricing');
const {
  _private: paypalOrderHelpers,
} = require('./create-paypal-order');

ensureRuntimeEnv();

function createPaypalCaptureHandler(dependencies = {}) {
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  const getEnv = dependencies.getEnv || (() => process.env);

  return async function paypalCaptureHandler(req, res) {
    setJsonHeaders(res);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let body;
    try {
      body = await paypalOrderHelpers.readJsonBody(req);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ error: error.publicMessage || 'Invalid JSON payload' });
    }

    if (!body || typeof body.orderId !== 'string' || !body.orderId.trim()) {
      return res.status(400).json({ error: 'PayPal orderId is required' });
    }

    try {
      const env = getEnv();
      const paypalClient = paypalOrderHelpers.getPaypalClient(env, fetchImpl);
      const paypalOrder = await capturePaypalOrder(paypalClient, body.orderId.trim());

      if (paypalOrder.status !== 'COMPLETED') {
        return res.status(409).json({ error: 'PayPal capture was not completed' });
      }

      const orderSummary = getOrderSummaryFromPayPalOrder(paypalOrder);

      if (!capturedAmountMatches(paypalOrder, orderSummary.amountDueNowCents)) {
        return res.status(409).json({ error: 'PayPal captured amount did not match checkout total' });
      }

      return res.status(200).json({
        status: paypalOrder.status,
        paypalOrderId: paypalOrder.id || body.orderId.trim(),
        orderSummary,
      });
    } catch (error) {
      const status = error.statusCode || 500;
      if (status >= 500) {
        console.error('PayPal order capture failed:', paypalOrderHelpers.sanitizeErrorForLog(error));
      }
      return res.status(status).json({ error: error.publicMessage || 'PayPal order capture failed' });
    }
  };
}

async function capturePaypalOrder(paypalClient, orderId) {
  return paypalClient.post(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {});
}

function capturedAmountMatches(paypalOrder, expectedCents) {
  const captures = paypalOrder.purchase_units
    ?.flatMap((unit) => unit.payments?.captures || []) || [];

  return captures.some((capture) => {
    const amount = capture.amount;
    if (amount?.currency_code !== 'USD') return false;
    return Math.round(Number(amount.value) * 100) === expectedCents;
  });
}

function getOrderSummaryFromPayPalOrder(paypalOrder) {
  const customId = paypalOrder.purchase_units?.[0]?.custom_id;
  if (!customId || typeof customId !== 'string') {
    throw createHttpError(409, 'PayPal order is missing checkout metadata.');
  }

  try {
    return calculateOrder(paypalOrderHelpers.parseOrderMetadata(customId));
  } catch (_error) {
    throw createHttpError(409, 'PayPal order metadata is invalid.');
  }
}

function createHttpError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

function setJsonHeaders(res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }
}

const handler = createPaypalCaptureHandler();

module.exports = handler;
module.exports.createPaypalCaptureHandler = createPaypalCaptureHandler;
module.exports._private = {
  capturedAmountMatches,
  capturePaypalOrder,
  getOrderSummaryFromPayPalOrder,
};
