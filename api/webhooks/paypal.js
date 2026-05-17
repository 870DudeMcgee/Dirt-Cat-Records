const {
  parseCompletedPaymentEvent,
  verifyPayPalWebhookSignature,
} = require('../../lib/paypal/webhook');
const {
  upsertPaidOrder,
} = require('../../lib/db/supabase-orders');

function createPaypalWebhookHandler(dependencies = {}) {
  const verifySignature = dependencies.verifySignature || verifyPayPalWebhookSignature;
  const parseEvent = dependencies.parseEvent || parseCompletedPaymentEvent;
  const upsertOrder = dependencies.upsertOrder || upsertPaidOrder;
  const logError = dependencies.logError || console.error;

  return async function paypalWebhookHandler(req, res) {
    setJsonHeaders(res);

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let webhookEvent;
    try {
      webhookEvent = await readJsonBody(req);
    } catch (_error) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    try {
      const verified = await verifySignature({ headers: req.headers || {}, webhookEvent });
      if (!verified) return res.status(401).json({ error: 'Invalid PayPal webhook signature' });

      const paymentRecord = parseEvent(webhookEvent);
      if (!paymentRecord) return res.status(200).json({ ok: true, ignored: true });

      const result = await upsertOrder(paymentRecord);
      return res.status(200).json({ ok: true, ignored: false, orderId: result.order.id });
    } catch (error) {
      const status = isClientWebhookError(error) ? 400 : 500;
      if (status === 500) logError('PayPal webhook handling failed:', error);
      return res.status(status).json({ error: status === 400 ? error.message : 'Webhook handling failed' });
    }
  };
}

async function readJsonBody(req) {
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}

function setJsonHeaders(res) {
  if (typeof res.setHeader === 'function') res.setHeader('Content-Type', 'application/json');
}

function isClientWebhookError(error) {
  return /Missing PayPal webhook header|Completed PayPal event|Unsupported PayPal currency/i
    .test(error.message || '');
}

const handler = createPaypalWebhookHandler();

module.exports = handler;
module.exports.createPaypalWebhookHandler = createPaypalWebhookHandler;
