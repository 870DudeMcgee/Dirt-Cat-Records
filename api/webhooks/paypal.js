const { ensureRuntimeEnv } = require("../../lib/env/runtime");
const {
  parsePayPalWebhookEvent,
  verifyPayPalWebhookSignature,
} = require("../../lib/paypal/webhook");
const {
  createPayPalWebhookVerifier,
} = require("../../lib/paypal/webhook-verifier");
const {
  createPaidProjectWorkflow,
} = require("../../lib/automation/studio-workflow");

ensureRuntimeEnv();

const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;

function createPaypalWebhookHandler(dependencies = {}) {
  const env = dependencies.env || process.env;
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;
  const verifySignature =
    dependencies.verifySignature ||
    createDefaultVerifySignature({ env, fetchImpl });
  const parseEvent = dependencies.parseEvent || parsePayPalWebhookEvent;
  const runPaidProjectWorkflow =
    dependencies.runPaidProjectWorkflow || createPaidProjectWorkflow();
  const logError = dependencies.logError || console.error;

  return async function paypalWebhookHandler(req, res) {
    setJsonHeaders(res);

    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    let webhookEvent;
    try {
      webhookEvent = await readJsonBody(req);
    } catch (error) {
      if (error.code === "PAYLOAD_TOO_LARGE") {
        return res.status(413).json({ error: "Webhook payload is too large" });
      }
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    try {
      const verified = await verifySignature({
        headers: req.headers || {},
        webhookEvent,
      });
      if (!verified)
        return res
          .status(401)
          .json({ error: "Invalid PayPal webhook signature" });

      const paymentRecord = await parseEvent(webhookEvent);
      if (!paymentRecord)
        return res.status(200).json({ ok: true, ignored: true });

      const result = await runPaidProjectWorkflow(paymentRecord);
      return res
        .status(200)
        .json({ ok: true, ignored: false, projectId: result.project.id });
    } catch (error) {
      const status = isClientWebhookError(error) ? 400 : 500;
      if (status === 500)
        logError("PayPal webhook handling failed:", sanitizeErrorForLog(error));
      return res
        .status(status)
        .json({
          error: status === 400 ? error.message : "Webhook handling failed",
        });
    }
  };
}

function createDefaultVerifySignature({ env, fetchImpl }) {
  try {
    const verifier = createPayPalWebhookVerifier({ env, fetchImpl });
    return ({ headers, webhookEvent }) =>
      verifier.verifySignature({ headers, webhookEvent });
  } catch (error) {
    return async function failConfiguredVerification() {
      throw error;
    };
  }
}

async function readJsonBody(req) {
  const contentLength = Number(req.headers?.["content-length"]);
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_WEBHOOK_BODY_BYTES
  ) {
    throw createPayloadTooLargeError();
  }

  if (typeof req.body === "string") {
    assertBodySize(Buffer.byteLength(req.body, "utf8"));
    return req.body ? JSON.parse(req.body) : {};
  }

  if (Buffer.isBuffer(req.body)) {
    assertBodySize(req.body.length);
    return JSON.parse(req.body.toString("utf8"));
  }

  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  let bytesRead = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytesRead += buffer.length;
    assertBodySize(bytesRead);
    chunks.push(buffer);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function setJsonHeaders(res) {
  if (typeof res.setHeader === "function")
    res.setHeader("Content-Type", "application/json");
}

function isClientWebhookError(error) {
  return /Missing PayPal webhook header|Completed PayPal event|Unsupported PayPal currency|checkout metadata/i.test(
    error.message || ""
  );
}

function assertBodySize(size) {
  if (size > MAX_WEBHOOK_BODY_BYTES) {
    throw createPayloadTooLargeError();
  }
}

function createPayloadTooLargeError() {
  const error = new Error("Webhook payload is too large");
  error.code = "PAYLOAD_TOO_LARGE";
  return error;
}

function sanitizeErrorForLog(error) {
  const sanitized = {
    name: error?.name || "Error",
    message: error?.message || "Unknown webhook error",
  };

  if (error?.diagnostics && typeof error.diagnostics === "object") {
    sanitized.diagnostics = error.diagnostics;
  }

  return sanitized;
}

const handler = createPaypalWebhookHandler();

module.exports = handler;
module.exports.createPaypalWebhookHandler = createPaypalWebhookHandler;
