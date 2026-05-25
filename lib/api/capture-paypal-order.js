const { ensureRuntimeEnv } = require("../env/runtime");
const { calculateOrder } = require("../checkout/pricing");
const { _private: paypalOrderHelpers } = require("./create-paypal-order");

ensureRuntimeEnv();

function createPaypalCaptureHandler(dependencies = {}) {
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  const getEnv = dependencies.getEnv || (() => process.env);

  return async function paypalCaptureHandler(req, res) {
    setJsonHeaders(res);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let body;
    try {
      body = await paypalOrderHelpers.readJsonBody(req);
    } catch (error) {
      return res
        .status(error.statusCode || 400)
        .json({ error: error.publicMessage || "Invalid JSON payload" });
    }

    if (!body || typeof body.orderId !== "string" || !body.orderId.trim()) {
      return res.status(400).json({ error: "PayPal orderId is required" });
    }

    try {
      const env = getEnv();
      const paypalClient = paypalOrderHelpers.getPaypalClient(env, fetchImpl);
      const paypalOrderDetails = await getPaypalOrder(
        paypalClient,
        body.orderId.trim()
      );
      const paypalOrder = await capturePaypalOrder(
        paypalClient,
        body.orderId.trim()
      );
      let orderSummary;
      try {
        orderSummary = getOrderSummaryFromPayPalOrder(
          paypalOrderDetails,
          paypalOrder
        );
      } catch (error) {
        error.paypalOrderDetails = paypalOrderDetails;
        error.paypalCaptureResponse = paypalOrder;
        throw error;
      }
      const completedCapture = findMatchingCompletedCapture(
        paypalOrder,
        orderSummary.amountDueNowCents
      );

      if (paypalOrder.status !== "COMPLETED" && !completedCapture) {
        return res
          .status(409)
          .json({ error: "PayPal capture was not completed" });
      }

      if (!completedCapture) {
        return res.status(409).json({
          error: "PayPal captured amount did not match checkout total",
        });
      }

      return res.status(200).json({
        status: paypalOrder.status,
        paypalOrderId: paypalOrder.id || body.orderId.trim(),
        orderSummary,
      });
    } catch (error) {
      const status = error.statusCode || 500;
      if (status === 409) {
        console.warn(
          "PayPal order capture conflict:",
          buildCaptureDiagnostics(error, body?.orderId)
        );
      }
      if (status >= 500) {
        console.error(
          "PayPal order capture failed:",
          paypalOrderHelpers.sanitizeErrorForLog(error)
        );
      }
      return res
        .status(status)
        .json({ error: error.publicMessage || "PayPal order capture failed" });
    }
  };
}

async function capturePaypalOrder(paypalClient, orderId) {
  return paypalClient.post(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {}
  );
}

async function getPaypalOrder(paypalClient, orderId) {
  return paypalClient.get(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

function capturedAmountMatches(paypalOrder, expectedCents) {
  return Boolean(findMatchingCompletedCapture(paypalOrder, expectedCents));
}

function findMatchingCompletedCapture(paypalOrder, expectedCents) {
  const captures =
    paypalOrder.purchase_units?.flatMap(
      (unit) => unit.payments?.captures || []
    ) || [];

  return (
    captures.find((capture) => {
      const amount = capture.amount;
      if (capture?.status !== "COMPLETED") return false;
      if (amount?.currency_code !== "USD") return false;
      return Math.round(Number(amount.value) * 100) === expectedCents;
    }) || null
  );
}

function getOrderSummaryFromPayPalOrder(paypalOrder, fallbackPayPalOrder) {
  const customId =
    paypalOrder?.purchase_units?.find(
      (unit) => typeof unit?.custom_id === "string"
    )?.custom_id ||
    fallbackPayPalOrder?.purchase_units?.find(
      (unit) => typeof unit?.custom_id === "string"
    )?.custom_id;
  if (!customId || typeof customId !== "string") {
    throw createHttpError(409, "PayPal order is missing checkout metadata.");
  }

  try {
    return calculateOrder(paypalOrderHelpers.parseOrderMetadata(customId));
  } catch (_error) {
    throw createHttpError(409, "PayPal order metadata is invalid.");
  }
}

function createHttpError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

function buildCaptureDiagnostics(error, orderId) {
  return {
    message: error?.message || null,
    publicMessage: error?.publicMessage || null,
    orderId: typeof orderId === "string" ? orderId : null,
    orderStatus: error?.paypalOrderDetails?.status || null,
    captureStatus: error?.paypalCaptureResponse?.status || null,
    orderCustomIdPresent:
      typeof error?.paypalOrderDetails?.purchase_units?.[0]?.custom_id ===
      "string",
    captureCustomIdPresent:
      typeof error?.paypalCaptureResponse?.purchase_units?.[0]?.custom_id ===
      "string",
    orderPurchaseUnitKeys: Object.keys(
      error?.paypalOrderDetails?.purchase_units?.[0] || {}
    ),
    capturePurchaseUnitKeys: Object.keys(
      error?.paypalCaptureResponse?.purchase_units?.[0] || {}
    ),
  };
}

function setJsonHeaders(res) {
  if (typeof res.setHeader === "function") {
    res.setHeader("Content-Type", "application/json");
  }
}

const handler = createPaypalCaptureHandler();

module.exports = handler;
module.exports.createPaypalCaptureHandler = createPaypalCaptureHandler;
module.exports._private = {
  buildCaptureDiagnostics,
  capturedAmountMatches,
  capturePaypalOrder,
  findMatchingCompletedCapture,
  getPaypalOrder,
  getOrderSummaryFromPayPalOrder,
};
