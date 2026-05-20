const { ensureRuntimeEnv } = require("../lib/env/runtime");
const {
  createPaidProjectWorkflow,
} = require("../lib/automation/studio-workflow");
const { buildNoChargeCheckoutPayment } = require("../lib/checkout/free-code");
const { calculateOrder, centsToDollars } = require("../lib/checkout/pricing");
const {
  buildOrderMetadata,
  parseOrderMetadata,
} = require("../lib/paypal/order-metadata");
const {
  createPayPalClient,
  readPayPalJsonResponse,
} = require("../lib/paypal/client-factory");
const {
  getPayPalBaseUrl: getPayPalBaseUrlFromConfig,
  getPayPalEnvironmentFromBaseUrl,
} = require("../lib/paypal/environment-config");

ensureRuntimeEnv();

const MAX_JSON_BODY_BYTES = 32 * 1024;

function createPaypalOrderHandler(dependencies = {}) {
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  const getEnv = dependencies.getEnv || (() => process.env);
  const paidProjectWorkflow =
    dependencies.paidProjectWorkflow || createPaidProjectWorkflow(dependencies);
  const idFactory = dependencies.idFactory;

  return async function paypalOrderHandler(req, res) {
    setJsonHeaders(res);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return res
        .status(error.statusCode || 400)
        .json({ error: error.publicMessage || "Invalid JSON payload" });
    }

    if (body && body.paymentMethod === "no_charge") {
      return handleNoChargeCheckout({
        body,
        res,
        env: getEnv(),
        paidProjectWorkflow,
        idFactory,
      });
    }

    let orderSummary;
    try {
      orderSummary =
        body && body.paymentPurpose === "quote"
          ? normalizeQuotePaymentInput(body)
          : calculateOrder(body);
    } catch (error) {
      return res
        .status(400)
        .json({ error: error.message || "Invalid checkout order" });
    }

    try {
      const env = getEnv();
      const paypalClient = getPaypalClient(env, fetchImpl);
      const paypalOrder = await createPaypalOrder(paypalClient, orderSummary);

      if (!paypalOrder || typeof paypalOrder.id !== "string") {
        return res
          .status(502)
          .json({ error: "PayPal did not return an order id" });
      }

      return res.status(200).json({
        id: paypalOrder.id,
        orderSummary,
      });
    } catch (error) {
      const status = error.statusCode || 500;
      if (status >= 500) {
        console.error(
          "PayPal order creation failed:",
          sanitizeErrorForLog(error)
        );
      }
      return res
        .status(status)
        .json({ error: error.publicMessage || "PayPal order creation failed" });
    }
  };
}

async function handleNoChargeCheckout({
  body,
  res,
  env,
  paidProjectWorkflow,
  idFactory,
}) {
  let paymentInput;
  try {
    paymentInput = buildNoChargeCheckoutPayment(body, { env, idFactory });
  } catch (error) {
    return res
      .status(400)
      .json({ error: error.message || "Discount code is not valid." });
  }

  try {
    const result = await paidProjectWorkflow(paymentInput);
    return res.status(200).json({
      ok: true,
      noChargeCheckout: true,
      projectId: result.project?.id || null,
      orderSummary: paymentInput.orderSummary,
    });
  } catch (error) {
    console.error("No-charge checkout failed:", sanitizeErrorForLog(error));
    return res.status(error.statusCode || 500).json({
      error: "Unable to start no-charge checkout.",
    });
  }
}

async function createPaypalOrder(paypalClient, orderSummary) {
  return paypalClient.post("/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: centsToDollars(orderSummary.amountDueNowCents),
        },
        description: buildOrderDescription(orderSummary),
        custom_id: buildOrderMetadata(orderSummary),
      },
    ],
    application_context: {
      brand_name: "Dirt Cat Records",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
    },
  });
}

function buildOrderDescription(orderSummary) {
  if (orderSummary.paymentPurpose === "quote") {
    return `Quote payment: ${orderSummary.quoteId}`;
  }
  if (orderSummary.paymentPurpose === "balance") {
    return `Balance payment: ${orderSummary.projectId}`;
  }
  const paymentLabel =
    orderSummary.paymentMode === "deposit" ? "Deposit" : "Full payment";
  return `${paymentLabel}: ${orderSummary.baseServiceLabel} (${orderSummary.songCount} song${orderSummary.songCount === 1 ? "" : "s"})`;
}

function normalizeQuotePaymentInput(body) {
  const quoteId = typeof body.quoteId === "string" ? body.quoteId.trim() : "";
  const projectId =
    typeof body.projectId === "string" ? body.projectId.trim() : "";
  const amountCents = Number(body.amountCents);
  const totalCents =
    body.totalCents === undefined ? amountCents : Number(body.totalCents);
  if (
    !quoteId ||
    !projectId ||
    !Number.isInteger(amountCents) ||
    amountCents < 1 ||
    !Number.isInteger(totalCents) ||
    totalCents < amountCents
  ) {
    throw new Error(
      "Quote payment requires projectId, quoteId, and amountCents."
    );
  }
  return {
    paymentPurpose: "quote",
    quoteId,
    projectId,
    amountCents,
    totalCents,
    amountDueNowCents: amountCents,
  };
}

function getPaypalClient(env, fetchImpl) {
  return createPayPalClient({
    env,
    fetchImpl,
    mapErrorToHttp: true,
  });
}

async function getPaypalAccessToken({
  baseUrl,
  clientId,
  clientSecret,
  fetchImpl,
}) {
  const client = createPayPalClient({
    env: {
      PAYPAL_CLIENT_ID: clientId,
      PAYPAL_CLIENT_SECRET: clientSecret,
      PAYPAL_ENV: getPayPalEnvironmentFromBaseUrl(baseUrl),
    },
    fetchImpl,
    mapErrorToHttp: true,
  });
  return client.getAccessToken();
}

function getPaypalBaseUrl(paypalEnv) {
  return getPayPalBaseUrlFromConfig(paypalEnv);
}

async function readPaypalJsonResponse(response, publicMessage) {
  return readPayPalJsonResponse(response, publicMessage, {
    mapErrorToHttp: true,
  });
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > MAX_JSON_BODY_BYTES) {
      throw createHttpError(413, "Request body is too large.");
    }
    return req.body ? JSON.parse(req.body) : {};
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      throw createHttpError(413, "Request body is too large.");
    }
    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function setJsonHeaders(res) {
  if (typeof res.setHeader === "function") {
    res.setHeader("Content-Type", "application/json");
  }
}

function createHttpError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

function sanitizeErrorForLog(error) {
  return {
    message: error.message,
    statusCode: error.statusCode,
    paypalStatus: error.paypalStatus,
    paypalDebugId: error.paypalResponse?.debug_id,
    paypalName: error.paypalResponse?.name,
  };
}

const handler = createPaypalOrderHandler();

module.exports = handler;
module.exports.createPaypalOrderHandler = createPaypalOrderHandler;
module.exports._private = {
  buildOrderMetadata,
  buildOrderDescription,
  createPaypalOrder,
  getPaypalAccessToken,
  getPaypalBaseUrl,
  getPaypalClient,
  handleNoChargeCheckout,
  normalizeQuotePaymentInput,
  parseOrderMetadata,
  readJsonBody,
  readPaypalJsonResponse,
  sanitizeErrorForLog,
};
