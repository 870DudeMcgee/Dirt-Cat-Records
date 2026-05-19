const { ensureRuntimeEnv } = require("../../lib/env/runtime");
const { requireUser } = require("../../lib/auth/supabase-auth");
const {
  methodNotAllowed,
  readJsonBody,
  sendJson,
} = require("../../lib/http/json");
const recordsDefault = require("../../lib/db/studio-records");
const {
  validateBalancePaymentRequest,
} = require("../../lib/portal/balance-payment-validator");
const { _private: paypalOrderHelpers } = require("../create-paypal-order");

ensureRuntimeEnv();

function createPortalBalancePaymentHandler(dependencies = {}) {
  const requireUserImpl = dependencies.requireUserImpl || requireUser;
  const records = dependencies.records || recordsDefault;
  const env = dependencies.env || process.env;
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;

  return async function portalBalancePaymentHandler(req, res) {
    if (req.method !== "POST") return methodNotAllowed(res);

    let user;
    try {
      user = await requireUserImpl(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 401, {
        error: error.message || "Authentication required.",
      });
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 400, {
        error: error.message || "Invalid request body.",
      });
    }

    const projectId =
      typeof body.projectId === "string" ? body.projectId.trim() : "";
    if (!projectId)
      return sendJson(res, 400, { error: "projectId is required." });

    try {
      const customer = await records.getCustomerByEmail(user.email);
      if (!customer)
        return sendJson(res, 404, { error: "Customer not found." });

      const validation = await validateBalancePaymentRequest({
        projectId,
        customerId: customer.id,
        records,
      });
      if (!validation.ok) {
        return sendJson(res, validation.statusCode, {
          error: validation.error,
          reason: validation.reason,
        });
      }
      const { project, amountCents } = validation;

      const paypalClient = paypalOrderHelpers.getPaypalClient(env, fetchImpl);
      const paypalOrder = await paypalOrderHelpers.createPaypalOrder(
        paypalClient,
        {
          paymentPurpose: "balance",
          projectId: project.id,
          amountCents,
          totalCents: amountCents,
          amountDueNowCents: amountCents,
        }
      );

      await records.createProjectEvent({
        projectId: project.id,
        eventType: "balance_checkout_started",
        actorType: "customer",
        message: "Customer started balance checkout.",
        metadata: {
          paymentPurpose: "balance",
          paypalOrderId: paypalOrder.id,
          balanceCents: amountCents,
        },
      });

      const approvalUrl = Array.isArray(paypalOrder.links)
        ? paypalOrder.links.find((link) => link && link.rel === "approve")
            ?.href || null
        : null;

      return sendJson(res, 200, {
        ok: true,
        paypalOrderId: paypalOrder.id,
        approvalUrl,
      });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode
          ? error.message
          : "Unable to start balance checkout.",
      });
    }
  };
}

const handler = createPortalBalancePaymentHandler();

module.exports = handler;
module.exports.createPortalBalancePaymentHandler =
  createPortalBalancePaymentHandler;
