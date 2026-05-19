const { ensureRuntimeEnv } = require('../../lib/env/runtime');
const { requireUser } = require('../../lib/auth/supabase-auth');
const { methodNotAllowed, readJsonBody, sendJson } = require('../../lib/http/json');
const recordsDefault = require('../../lib/db/studio-records');
const {
  _private: paypalOrderHelpers,
} = require('../create-paypal-order');

ensureRuntimeEnv();

function createPortalAcceptQuoteHandler(dependencies = {}) {
  const requireUserImpl = dependencies.requireUserImpl || requireUser;
  const records = dependencies.records || recordsDefault;
  const env = dependencies.env || process.env;
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;

  return async function portalAcceptQuoteHandler(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);

    let user;
    try {
      user = await requireUserImpl(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 401, { error: error.message || 'Authentication required.' });
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 400, { error: error.message || 'Invalid request body.' });
    }

    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
    const quoteId = typeof body.quoteId === 'string' ? body.quoteId.trim() : '';
    if (!projectId) return sendJson(res, 400, { error: 'projectId is required.' });
    if (!quoteId) return sendJson(res, 400, { error: 'quoteId is required.' });

    try {
      const customer = await records.getCustomerByEmail(user.email);
      if (!customer) return sendJson(res, 404, { error: 'Customer not found.' });

      const project = await records.getProjectForCustomer(projectId, customer.id);
      if (!project) return sendJson(res, 404, { error: 'Project not found.' });

      const quote = records.getQuoteForProjectCustomer
        ? await records.getQuoteForProjectCustomer({ quoteId, projectId, customerId: customer.id })
        : await records.getQuoteById(quoteId);
      if (!quote) return sendJson(res, 404, { error: 'Quote not found.' });

      if (['accepted', 'expired', 'cancelled'].includes(quote.status)) {
        return sendJson(res, 409, { error: 'Quote is not payable in its current status.' });
      }

      const now = new Date().toISOString();
      if (quote.status === 'sent' || quote.status === 'draft') {
        await records.updateQuote(quote.id, {
          status: 'viewed',
          viewed_at: now,
        });
      }

      const amountDueNowCents = quote.payment_mode === 'deposit'
        ? Number(quote.deposit_cents || 0)
        : Number(quote.final_total_cents || 0);
      const paypalClient = paypalOrderHelpers.getPaypalClient(env, fetchImpl);
      const paypalOrder = await paypalOrderHelpers.createPaypalOrder(paypalClient, {
        paymentPurpose: 'quote',
        quoteId: quote.id,
        projectId: project.id,
        amountCents: amountDueNowCents,
        totalCents: Number(quote.final_total_cents || amountDueNowCents),
        amountDueNowCents,
      });

      await records.createProjectEvent({
        projectId: project.id,
        eventType: 'quote_checkout_started',
        actorType: 'customer',
        message: 'Customer started quote checkout.',
        metadata: {
          quoteId: quote.id,
          paypalOrderId: paypalOrder.id,
        },
      });

      const approvalUrl = Array.isArray(paypalOrder.links)
        ? paypalOrder.links.find((link) => link && link.rel === 'approve')?.href || null
        : null;

      return sendJson(res, 200, {
        ok: true,
        paypalOrderId: paypalOrder.id,
        approvalUrl,
      });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        error: error.statusCode ? error.message : 'Unable to start quote checkout.',
      });
    }
  };
}

const handler = createPortalAcceptQuoteHandler();

module.exports = handler;
module.exports.createPortalAcceptQuoteHandler = createPortalAcceptQuoteHandler;
